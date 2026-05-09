import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import promClient from 'prom-client';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";
import winston from "winston";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const app = express();

app.use(cors({ origin: "*" }));

// Prometheus Metrics Setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  // Pass to logger conditionally if desired
  next();
});

/* ---------------- CONFIG ---------------- */

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_change_in_production_32chars";

/* ---------------- LOGGING ---------------- */

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

/* ---------------- DB ---------------- */

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

/* ---------------- REDIS ---------------- */

const rdb = createClient({
  url: process.env.REDIS_URL
});

rdb.connect().then(() => {
  logger.info("Redis connected");
}).catch((err) => {
  logger.error("Redis connection failed", err);
});

/* ---------------- INIT ---------------- */

async function initDB() {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'reporter',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`
    INSERT INTO users (id, email, password_hash, display_name, role) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@irtdp.com', '$2a$10$cBm7eak8VnbRYJxRUNV2TeNtpaNK8jeJCL7IZbjlqgvCtFHSw8Mim', 'Platform Admin', 'admin') 
    ON CONFLICT (email) DO NOTHING;
  `);
  logger.info("DB ready");
}

/* ---------------- ROUTES ---------------- */

// REGISTER
app.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const exist = await db.query("SELECT id FROM users WHERE email=$1", [email]);

    if (exist.rows.length) {
      return res.status(409).json({ error: "User exists" });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const role = "reporter";

    await db.query(
      "INSERT INTO users(id,email,password_hash,display_name,role) VALUES($1,$2,$3,$4,$5)",
      [id, email, hash, displayName, role]
    );

    logger.info(`User registered: ${id}`);
    res.status(201).json({ message: "User created" });
  } catch (err) {
    next(err);
  }
});

// LOGIN
app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role || 'reporter' },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    logger.info(`User logged in: ${user.id}`);
    res.json({ accessToken: token });
  } catch (err) {
    next(err);
  }
});

// VERIFY
app.post("/verify", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    res.json({ valid: true, userId: decoded.sub, role: decoded.role });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// HEALTH
app.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "OK" });
  } catch (err) {
    next(err);
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

/* ---------------- START ---------------- */

app.listen(PORT, async () => {
  logger.info(`Auth Service running on ${PORT}`);
  await initDB();
});