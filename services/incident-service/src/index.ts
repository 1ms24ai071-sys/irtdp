import express, { Request, Response, NextFunction } from "express";
import promClient from 'prom-client';
import pkg from "pg";
import dotenv from "dotenv";
import { z } from "zod";
import winston from "winston";
import { Server as SocketServer } from "socket.io";
import { createServer } from "http";
import { findNearestResponseCenter } from "./routing";

dotenv.config();

const { Pool } = pkg;

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || "*",
    methods: ["GET", "POST"]
  }
});

// Prometheus Metrics Setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || require('uuid').v4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// DB
const dbConnectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'postgres',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.POSTGRES_USER || 'irtdp',
      password: process.env.POSTGRES_PASSWORD || 'irtdp_secret',
      database: process.env.POSTGRES_DB || 'irtdp',
    };

const pool = new Pool(dbConnectionConfig);

// Hardcoded response centers (in production, this would be from DB)
const responseCenters = [
  { id: "center-1", name: "Downtown Station", status: "available" as const, latitude: 40.7128, longitude: -74.0060 },
  { id: "center-2", name: "Brooklyn Station", status: "available" as const, latitude: 40.6782, longitude: -73.9442 },
  { id: "center-3", name: "Queens Station", status: "available" as const, latitude: 40.7282, longitude: -73.7949 },
  { id: "center-4", name: "Bronx Station", status: "available" as const, latitude: 40.8448, longitude: -73.8648 },
  { id: "center-5", name: "Staten Island Station", status: "available" as const, latitude: 40.5795, longitude: -74.1502 },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDatabaseConnection(retries = 6, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info("✅ PostgreSQL connected");
      return;
    } catch (err) {
      logger.error(`❌ DB ERROR (attempt ${attempt}/${retries}):`, err);
      if (attempt === retries) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}

// Validation Schema
const incidentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
  latitude: z.number({
    required_error: "Latitude is required",
    invalid_type_error: "Latitude must be a number"
  }).min(-90).max(90),
  longitude: z.number({
    required_error: "Longitude is required",
    invalid_type_error: "Longitude must be a number"
  }).min(-180).max(180)
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// CREATE INCIDENT
app.post("/api/incidents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = incidentSchema.parse(req.body);
    const reporterId = req.headers['x-user-id'] || null;

    const result = await pool.query(
      `INSERT INTO incidents (id, title, description, category, latitude, longitude, location, status, reporter_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), 'reported', $6)
       RETURNING *`,
      [validated.title, validated.description || null, validated.category || 'general', validated.latitude, validated.longitude, reporterId]
    );

    const incident = result.rows[0];

    // Automatic routing
    const route = findNearestResponseCenter(
      { latitude: validated.latitude, longitude: validated.longitude },
      responseCenters
    );

    if (route) {
      // Update incident with routing data
      await pool.query(
        `UPDATE incidents SET assigned_unit_id = $1, distance_km = $2, eta_minutes = $3 WHERE id = $4`,
        [route.center.id, route.distanceKm, route.etaMinutes, incident.id]
      );

      incident.assigned_unit_id = route.center.id;
      incident.distance_km = route.distanceKm;
      incident.eta_minutes = route.etaMinutes;
      incident.assignedUnit = route.center;
      incident.distanceKm = route.distanceKm;
      incident.etaMinutes = route.etaMinutes;
    }

    logger.info(`Incident created: ${incident.id}`);
    
    // Emit socket event
    io.emit('incident:created', incident);

    res.status(201).json({
      success: true,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
});

// GET INCIDENTS
app.get("/api/incidents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      "SELECT * FROM incidents ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
});

const routeRequestSchema = z.object({
  incident: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    lat: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    lon: z.number().min(-180).max(180).optional(),
  }).refine(
    obj => (obj.latitude ?? obj.lat) !== undefined && (obj.longitude ?? obj.lon) !== undefined,
    "Must provide latitude (or lat) and longitude (or lon)"
  ).transform(obj => ({
    latitude: obj.latitude ?? obj.lat ?? 0,
    longitude: obj.longitude ?? obj.lon ?? 0,
  })),
  centers: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.enum(["available", "assigned", "unavailable"]),
    latitude: z.number().min(-90).max(90).optional(),
    lat: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    lon: z.number().min(-180).max(180).optional(),
  }).transform(obj => ({
    id: obj.id,
    name: obj.name,
    status: obj.status,
    latitude: obj.latitude ?? obj.lat ?? 0,
    longitude: obj.longitude ?? obj.lon ?? 0,
  }))).min(1),
  speedKmh: z.number().optional(),
});

app.post("/api/incidents/route", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = routeRequestSchema.parse(req.body);
    const route = findNearestResponseCenter(validated.incident, validated.centers, { speedKmh: validated.speedKmh });

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "No available response center found",
      });
    }

    res.json({
      success: true,
      data: {
        assignedUnit: route.center,
        distanceKm: route.distanceKm,
        etaMinutes: route.etaMinutes,
        responseCenter: route.center,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof z.ZodError) {
    return res.status(400).json({ success: false, error: err.errors });
  }

  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

async function startService() {
  try {
    await waitForDatabaseConnection();
    server.listen(PORT as number, () => {
      logger.info(`🚀 Incident service running on ${PORT}`);
    });
  } catch (err) {
    logger.error("❌ Failed to connect to PostgreSQL after retries. Exiting.", err);
    process.exit(1);
  }
}

startService();