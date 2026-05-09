/**
 * Processing Service — async Redis worker
 * Pipeline: S3 fetch → thumbnail → transcribe → KMP → moderation → store
 */
import { createClient } from "redis";
import { Pool } from "pg";
import { Client as ES } from "@elastic/elasticsearch";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import winston from "winston";
import { detectKeywords, DANGER_KEYWORDS } from "./algorithms";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "processing-service" },
  transports: [new winston.transports.Console()]
});

const rdb = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: retries => Math.min(retries * 100, 3000) } });
rdb.on("error", (err) => {
  try {
    logger.error("Redis client error", { error: err.message });
  } catch (logErr) {
    console.error("Failed to log Redis error", logErr, err.message);
  }
});
const pub = rdb.duplicate();
pub.on("error", (err) => {
  try {
    logger.error("Redis pub client error", { error: err.message });
  } catch (logErr) {
    console.error("Failed to log Redis pub error", logErr, err.message);
  }
});
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
const es = new ES({ node: process.env.ELASTICSEARCH_URL });
const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "" },
  forcePathStyle: !!process.env.S3_ENDPOINT,
});
const BUCKET = process.env.S3_BUCKET ?? "incident-media";

const app = express();
app.get("/health", (_, res) => res.json({ status: "ok", service: "processing-service" }));

interface Job { mediaId:string; incidentId:string; s3Key:string; mediaType:string; mimetype:string; }

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

  await connectWithRetry("Redis publisher", async () => {
    if (!pub.isOpen) await pub.connect();
  });

  await connectWithRetry("Postgres", async () => {
    await db.query("SELECT 1");
  });

  await connectWithRetry("Elasticsearch", async () => {
    await es.ping();
  });
}

async function fetchS3(key: string): Promise<Buffer> {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const stream = r.Body as any;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function makeThumbnail(buf: Buffer, mediaType: string, baseKey: string): Promise<string | null> {
  try {
    const tb = mediaType === "image"
      ? await sharp(buf).resize(400, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer()
      : await sharp({ create: { width: 400, height: 220, channels: 3, background: { r: 30, g: 30, b: 40 } } }).jpeg().toBuffer();

    const key = `${baseKey}_thumb.jpg`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: tb, ContentType: "image/jpeg" }));
    return `s3://${BUCKET}/${key}`;
  } catch (error: any) {
    logger.warn("Thumbnail creation failed", { error: error?.message ?? error, mediaType, baseKey });
    return null;
  }
}

async function transcribe(mediaType: string): Promise<string | null> {
  if (mediaType === "image") return null;
  await delay(100);
  const samples = [
    "Armed robbery reported near the main market. Suspect fled with a weapon.",
    "Explosion heard near the warehouse district. Multiple people injured.",
    "Assault in progress near the park. Attacker has a knife.",
    "Suspicious activity near the government building. Unattended bag left outside.",
    "Fire broke out on the fourth floor. People are evacuating now.",
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

async function moderate(mediaType: string, transcript: string | null) {
  const flags: Array<{ category:string; confidence:number }> = [];
  if (transcript) {
    const kws = detectKeywords(transcript, DANGER_KEYWORDS);
    if (kws.length > 0) flags.push({ category: "dangerous_content", confidence: Math.min(0.5 + kws.length * 0.1, 1) });
  }
  if (mediaType === "image" && Math.random() < 0.04) flags.push({ category: "graphic_content", confidence: 0.7 });
  return { flagged: flags.length > 0, flags };
}

async function processMedia(job: Job) {
  const t0 = Date.now();
  logger.info("Processing media job", { mediaId: job.mediaId, incidentId: job.incidentId });
  await db.query("UPDATE media SET status='processing' WHERE id=$1", [job.mediaId]);
  try {
    const buf = await fetchS3(job.s3Key);
    const base = job.s3Key.replace(/\.[^.]+$/, "");
    const [thumb, transcript] = await Promise.all([
      makeThumbnail(buf, job.mediaType, base),
      transcribe(job.mediaType),
    ]);
    const mod = await moderate(job.mediaType, transcript);
    const kws = transcript ? detectKeywords(transcript, DANGER_KEYWORDS).map(k => k.keyword) : [];
    const risk = mod.flags.some(f => f.confidence > 0.8)
      ? "high"
      : mod.flagged || kws.length > 2
      ? "medium"
      : "low";
    const ms = Date.now() - t0;

    await db.query(
      `INSERT INTO media_processing(id,media_id,thumbnail_url,transcript,keywords,moderation_flags,risk_score,processing_time_ms)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (media_id) DO UPDATE
         SET thumbnail_url=$3,transcript=$4,keywords=$5,moderation_flags=$6,risk_score=$7,processing_time_ms=$8,processed_at=NOW()`,
      [uuidv4(), job.mediaId, thumb, transcript, kws, JSON.stringify(mod.flags), risk, ms]
    );

    await db.query("UPDATE media SET status=$1 WHERE id=$2", [mod.flagged ? "flagged" : "processed", job.mediaId]);

    if (transcript) {
      try {
        await es.index({ index: "media_transcripts", id: job.mediaId, document: { mediaId: job.mediaId, incidentId: job.incidentId, transcript, keywords: kws, riskScore: risk, processedAt: new Date() } });
      } catch (error: any) {
        logger.warn("Failed to index transcript", { error: error?.message ?? error, mediaId: job.mediaId });
      }
    }
    if (risk === "high") {
      await pub.publish("notifications:send", JSON.stringify({
        type: "high_risk_media",
        incidentId: job.incidentId,
        mediaId: job.mediaId,
        message: `High-risk media detected on incident ${job.incidentId}`,
      }));
    }
    logger.info("Media job completed", { mediaId: job.mediaId, risk, durationMs: ms });
  } catch (error: any) {
    logger.error("Failed to process media job", { error: error?.message ?? error, mediaId: job.mediaId });
    await db.query("UPDATE media SET status='failed' WHERE id=$1", [job.mediaId]);
  }
}

let server: ReturnType<typeof app.listen> | null = null;

async function shutdown(signal: string) {
  logger.info("Shutdown signal received", { signal });
  try {
    server?.close();
    await pub.quit();
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
  await openConnections();
  const PORT = Number(process.env.PORT ?? 3004);
  server = app.listen(PORT, () => logger.info(`Processing Service on :${PORT}`));

  while (true) {
    try {
      const item = await rdb.blPop("media:processing:queue", 5);
      if (item?.element) {
        await processMedia(JSON.parse(item.element) as Job);
      }
    } catch (error: any) {
      logger.error("Worker error", { error: error?.message ?? error });
      await delay(1000);
    }
  }
}

run().catch((error: any) => {
  logger.error("Fatal processing service error", { error: error?.message ?? error });
  process.exit(1);
});