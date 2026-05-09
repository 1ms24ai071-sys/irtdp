import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;
const INCIDENT = process.env.INCIDENT_SERVICE_URL || "http://localhost:3002";
const AUTH = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const MEDIA = process.env.MEDIA_SERVICE_URL || "http://localhost:3003";
const PROCESSING = process.env.PROCESSING_SERVICE_URL || "http://localhost:3004";
const NOTIF = process.env.NOTIF_SERVICE_URL || "http://localhost:3005";
const AUDIT = process.env.AUDIT_SERVICE_URL || "http://localhost:3006";
const PDF = process.env.PDF_SERVICE_URL || "http://localhost:3007";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_change_in_production_32chars";

// Security Middleware
app.use(helmet());
import { v4 as uuidv4 } from "uuid";
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || "*" }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

// 🔥 DO NOT USE express.json() HERE (Breaks proxy)

// AUTH MIDDLEWARE
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    // Pass user ID and Role downstream
    req.headers['x-user-id'] = decoded.sub;
    if (decoded.role) {
      req.headers['x-user-role'] = decoded.role;
    }

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ROUTING
app.use("/api/auth", createProxyMiddleware({
  target: AUTH,
  changeOrigin: true,
  pathRewrite: { "^/api/auth": "" }
}));

// Proxy middleware with auth
const proxyOptions = (target: string) => ({
  target,
  changeOrigin: true
});

app.use("/api/incidents", authMiddleware, createProxyMiddleware(proxyOptions(INCIDENT)));
app.use("/api/media", authMiddleware, createProxyMiddleware(proxyOptions(MEDIA)));
app.use("/api/processing", authMiddleware, createProxyMiddleware(proxyOptions(PROCESSING)));
app.use("/api/notifications", authMiddleware, createProxyMiddleware(proxyOptions(NOTIF)));
app.use("/api/audit", authMiddleware, createProxyMiddleware(proxyOptions(AUDIT)));
app.use("/api/report", authMiddleware, createProxyMiddleware(proxyOptions(PDF)));

// HEALTH
app.get("/health", (_req, res) => {
  res.json({ status: "ok", gateway: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Gateway running on ${PORT}`);
});