const fs = require('fs');

// 1. pdf-service/src/index.js
let pdfService = fs.readFileSync('services/pdf-service/src/index.js', 'utf8');
pdfService = pdfService.replace('const express = require("express");', `const express = require("express");\nconst winston = require("winston");\n\nconst logger = winston.createLogger({\n  level: "info",\n  format: winston.format.json(),\n  transports: [new winston.transports.Console()]\n});`);
pdfService = pdfService.replace(/console\.log/g, "logger.info");
pdfService = pdfService.replace(/console\.error/g, "logger.error");
if (!pdfService.includes('// Auth middleware')) {
  pdfService = pdfService.replace('app.use(helmet());', 'app.use(helmet());\n\n// Auth middleware\napp.use((req, res, next) => {\n  if (!req.headers["x-user-id"] && req.path !== "/health") return res.status(401).json({ error: "Unauthorized" });\n  next();\n});');
}
if (!pdfService.includes('Internal Server Error')) {
  pdfService = pdfService.replace('app.get("/health"', `app.use((err, req, res, next) => {\n  logger.error(err.message, { stack: err.stack });\n  res.status(500).json({ error: "Internal Server Error" });\n});\n\napp.get("/health"`);
}
fs.writeFileSync('services/pdf-service/src/index.js', pdfService);

// 2. media-service/src/index.ts
let mediaService = fs.readFileSync('services/media-service/src/index.ts', 'utf8');
mediaService = mediaService.replace(/async function auth[^}]*\}[^}]*\}/s, `async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {\n  const userId = req.headers["x-user-id"];\n  const role = req.headers["x-user-role"];\n  if (!userId) return res.status(401).json({ error: "Unauthorized" });\n  (req as any).userId = userId;\n  (req as any).role = role;\n  next();\n}`);
if (!mediaService.includes('errorHandler')) {
  mediaService = mediaService.replace('app.use(cors());', 'app.use(cors());\n\n// Error handler\nconst errorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {\n  logger.error(err.message, { stack: err.stack });\n  res.status(500).json({ error: "Internal Server Error" });\n};\napp.use(errorHandler);');
}
fs.writeFileSync('services/media-service/src/index.ts', mediaService);

// 3. audit-service/src/index.ts
let auditService = fs.readFileSync('services/audit-service/src/index.ts', 'utf8');
if (!auditService.includes('if (!req.headers["x-user-id"]')) {
  auditService = auditService.replace('app.use(cors());', 'app.use(cors());\n\napp.use((req, res, next) => {\n  if (!req.headers["x-user-id"] && req.path !== "/health") return res.status(401).json({ error: "Unauthorized" });\n  next();\n});');
}
if (!auditService.includes('x-forwarded-for')) {
  auditService = auditService.replace('d.ipAddress || null,', '(req.headers["x-forwarded-for"] || d.ipAddress || null),');
}
if (!auditService.includes('res.status(500).json({ error: "Internal Server Error" })')) {
  auditService = auditService.replace('/* ---------------- HEALTH', `app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {\n  logger.error(err.message, { stack: err.stack });\n  res.status(500).json({ error: "Internal Server Error" });\n});\n\n/* ---------------- HEALTH`);
}
fs.writeFileSync('services/audit-service/src/index.ts', auditService);

// 4. notification-service/src/index.ts
let nService = fs.readFileSync('services/notification-service/src/index.ts', 'utf8');
if (!nService.includes('Internal Server Error')) {
  nService = nService.replace('app.get("/health"', `app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {\n  logger.error(err.message, { stack: err.stack });\n  res.status(500).json({ error: "Internal Server Error" });\n});\n\napp.get("/health"`);
}
fs.writeFileSync('services/notification-service/src/index.ts', nService);

// 5. docker-compose.yml
let docker = fs.readFileSync('docker-compose.yml', 'utf8');
docker = docker.replace(/irtdp_secret/g, '${POSTGRES_PASSWORD:-irtdp_secret}');
docker = docker.replace(/redis_secret/g, '${REDIS_PASSWORD:-redis_secret}');
if (!docker.includes('healthcheck:')) {
  docker = docker.replace('container_name: irtdp-postgres\n    restart: always', 'container_name: irtdp-postgres\n    restart: always\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U irtdp -d irtdp"]\n      interval: 10s\n      retries: 5\n      start_period: 30s');
  docker = docker.replace('container_name: irtdp-redis\n    restart: always', 'container_name: irtdp-redis\n    restart: always\n    healthcheck:\n      test: ["CMD", "redis-cli", "ping"]\n      interval: 10s\n      retries: 5\n      start_period: 10s');
  // Make auth-service depend on postgres and redis with condition
  docker = docker.replace('depends_on:\n      - postgres\n      - redis', 'depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy');
}
fs.writeFileSync('docker-compose.yml', docker);

console.log("Updates applied.");
