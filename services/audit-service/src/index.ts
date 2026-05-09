import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { Pool } from "pg";
import { createClient } from "redis";
import helmet from "helmet";
import cors from "cors";
import winston from "winston";
import { z } from "zod";

/* ---------------- APP ---------------- */

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());

app.use((req, res, next) => {
  if (!req.headers["x-user-id"] && req.path !== "/health") return res.status(401).json({ error: "Unauthorized" });
  next();
});

/* ---------------- LOGGER ---------------- */

const logger = winston.createLogger({
  level: "info",
  transports: [new winston.transports.Console()]
});

/* ---------------- DATABASE ---------------- */

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

/* ---------------- REDIS ---------------- */

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const consumerClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on("error", (err) => logger.error("Redis error", err));
consumerClient.on("error", (err) => logger.error("Consumer error", err));

async function initConnections() {
  // DB
  await db.query("SELECT 1");

  // Redis
  try {
    await redisClient.connect();
    await consumerClient.connect();
    logger.info("Redis connected");
  } catch {
    logger.warn("Redis unavailable");
  }
}

/* ---------------- SCHEMA ---------------- */

const AuditSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().uuid().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().optional(),
  details: z.record(z.any()).optional()
});

/* ---------------- PROCESS ---------------- */

async function processAuditLog(data: any) {
  const parsed = AuditSchema.safeParse(data);
  if (!parsed.success) return;

  const d = parsed.data;

  try {
    await db.query(
      `INSERT INTO audit_logs(action, entity_type, entity_id, user_id, ip_address, user_agent, details)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        d.action,
        d.entityType,
        d.entityId,
        d.userId,
        (req.headers["x-forwarded-for"] || d.ipAddress || null),
        d.userAgent,
        JSON.stringify(d.details || {})
      ]
    );
  } catch {
    logger.error("DB insert failed");
  }
}

/* ---------------- CONSUMER ---------------- */

async function startConsumer() {
  while (true) {
    try {
      const res = await consumerClient.brPop("audit:queue", 0);

      if (res?.element) {
        const data = JSON.parse(res.element);
        processAuditLog(data);
      }
    } catch {
      logger.error("Consumer error");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

/* ---------------- ROUTES ---------------- */

app.post("/api/audit/log", async (req, res) => {
  const parsed = AuditSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.lPush("audit:queue", JSON.stringify(parsed.data));
      return res.json({ queued: true });
    }

    await processAuditLog(parsed.data);
    return res.json({ fallback: true });

  } catch {
    return res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/audit/logs", async (_, res) => {
  const result = await db.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50"
  );
  res.json(result.rows);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

/* ---------------- HEALTH ---------------- */

app.get("/health", async (_, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      status: "OK",
      service: "audit-service",
      redis: redisClient.isOpen,
      consumer: consumerClient.isOpen,
      uptime: process.uptime()
    });

  } catch {
    res.status(500).json({ status: "ERROR" });
  }
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 3006;

app.listen(PORT, async () => {
  logger.info(`Audit Service on :${PORT}`);

  await initConnections();
  startConsumer();
});