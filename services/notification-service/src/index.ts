/**
 * Notification Service — WebSocket push + Redis pub/sub
 */
import express from "express";
import { createServer } from "http";
import { Server as IO } from "socket.io";
import { createClient } from "redis";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "notification-service" },
  transports: [new winston.transports.Console()]
});

const app = express();
app.use(express.json());
const http = createServer(app);
const io = new IO(http, { cors: { origin: "*" } });
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
const rdb = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: retries => Math.min(retries * 100, 3000) } });
rdb.on("error", (err) => {
  try {
    logger.error("Redis client error", { error: err.message });
  } catch (logErr) {
    console.error("Failed to log Redis error", logErr, err.message);
  }
});
const sub = rdb.duplicate();
sub.on("error", (err) => {
  try {
    logger.error("Redis sub client error", { error: err.message });
  } catch (logErr) {
    console.error("Failed to log Redis sub error", logErr, err.message);
  }
});

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function connectWithRetry<T>(label: string, fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const result = await fn();
      logger.info(`${label} connected`, { attempt: attempt + 1 });
      return result;
    } catch (error: any) {
      attempt += 1;
      logger.warn(`${label} connection failed`, { attempt, error: error?.message ?? error });
      if (attempt >= maxAttempts) {
        logger.error(`${label} failed after ${maxAttempts} attempts`, { error: error?.message ?? error });
        throw error;
      }
      await delay(2000 * attempt);
    }
  }
  throw new Error(`${label} connection attempts exhausted`);
}

async function openConnections() {
  await connectWithRetry("Redis", async () => {
    if (!rdb.isOpen) await rdb.connect();
    await rdb.ping();
  });
  await connectWithRetry("Postgres", async () => {
    await db.query("SELECT 1");
  });
  await connectWithRetry("Redis subscriber", async () => {
    await sub.connect();
  });
}

io.on("connection", socket => {
  const uid = socket.handshake.auth.userId;
  if (uid) socket.join(`user:${uid}`);
  socket.join("broadcast");
});

async function start() {
  await openConnections();

  await sub.subscribe("notifications:send", async (msg: string) => {
    try {
      const p = JSON.parse(msg);
      const { type, incidentId, mediaId, message, userId } = p;
      const titles: Record<string,string> = {
        high_risk_media: "High Risk Media Detected",
        incident_assigned: "Incident Assigned",
        incident_resolved: "Incident Resolved",
        new_incident: "New Incident Reported",
      };
      if (userId) {
        const id = uuidv4();
        await db.query(
          "INSERT INTO notifications(id,user_id,type,title,message,metadata) VALUES($1,$2,$3,$4,$5,$6)",
          [id, userId, type, titles[type] ?? "Notification", message, JSON.stringify({ incidentId, mediaId })]
        );
        io.to(`user:${userId}`).emit("notification", { id, type, message });
      } else {
        io.to("broadcast").emit("alert", { type, incidentId, message });
      }
    } catch (error: any) {
      logger.error("Failed to process notification event", { error: error?.message ?? error, payload: msg });
    }
  });

  await sub.subscribe("incidents:new", async (msg: string) => {
    try {
      const { incidentId } = JSON.parse(msg);
      io.emit("incident:new", { incidentId });
    } catch (error: any) {
      logger.error("Failed to process incidents:new event", { error: error?.message ?? error, payload: msg });
    }
  });

  logger.info("Notification subscriber ready");
}

app.get("/api/notifications", async (req, res) => {
  const uid = req.headers["x-user-id"] as string;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  try {
    const r = await db.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", [uid]);
    return res.json(r.rows);
  } catch (error: any) {
    logger.error("Failed to query notifications", { error: error?.message ?? error, userId: uid });
    return res.status(500).json({ error: "Server error." });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  const uid = req.headers["x-user-id"] as string;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  try {
    await db.query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2", [req.params.id, uid]);
    return res.json({ message: "Marked read." });
  } catch (error: any) {
    logger.error("Failed to mark notification read", { error: error?.message ?? error, userId: uid, notificationId: req.params.id });
    return res.status(500).json({ error: "Server error." });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/health", (_, res) => res.json({ status: "ok", service: "notification-service" }));

const PORT = Number(process.env.PORT ?? 3005);
let server: ReturnType<typeof http.listen> | null = null;

async function shutdown(signal: string) {
  logger.info("Shutdown signal received", { signal });
  try {
    server?.close();
    await sub.quit();
    await rdb.quit();
    await db.end();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error: any) {
    logger.error("Shutdown failed", { error: error?.message ?? error });
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  shutdown("unhandledRejection");
});

async function run() {
  await start();
  server = http.listen(PORT, () => logger.info(`Notification Service on :${PORT}`));
}

run().catch((error: any) => {
  logger.error("Notification service startup failed", { error: error?.message ?? error });
  process.exit(1);
});
