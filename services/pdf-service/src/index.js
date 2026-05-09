/**
 * PDF Service — Generate case reports
 */
const express = require("express");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});
const puppeteer = require("puppeteer");
const helmet = require("helmet");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(helmet());

// Auth middleware
app.use((req, res, next) => {
  if (!req.headers["x-user-id"] && req.path !== "/health") return res.status(401).json({ error: "Unauthorized" });
  next();
});
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));

const REPORT_DIR = path.resolve(__dirname, "reports");
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const PDF_BASE_URL = process.env.PDF_BASE_URL ?? "http://localhost:3007";
app.use("/files", express.static(REPORT_DIR));

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

// POST /generate
app.post("/generate", async (req, res) => {
  try {
    const { incidentId, incident, auditLogs = [], mapSnapshot } = req.body;

    if (!incidentId || !incident) {
      return res.status(400).json({ error: "incidentId and incident are required" });
    }

    const b = await getBrowser();
    const page = await b.newPage();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Case Report - ${incident.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #333; }
    .subtitle { font-size: 14px; color: #666; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; color: #555; }
    .value { color: #333; }
    .map { text-align: center; margin: 20px 0; }
    .map img { max-width: 100%; border: 1px solid #ccc; }
    .logs { margin-top: 20px; }
    .log-entry { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; background: #f9f9f9; }
    .log-time { font-size: 12px; color: #666; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">INCIDENT CASE REPORT</div>
    <div class="subtitle">IRTDP - Real-Time Incident Detection Platform</div>
    <div class="subtitle">Report Generated: ${new Date().toLocaleString()}</div>
  </div>

  <div class="section">
    <h2>Incident Details</h2>
    <div class="field"><span class="label">Incident ID:</span> <span class="value">${incident.id}</span></div>
    <div class="field"><span class="label">Title:</span> <span class="value">${incident.title}</span></div>
    <div class="field"><span class="label">Description:</span> <span class="value">${incident.description || 'N/A'}</span></div>
    <div class="field"><span class="label">Category:</span> <span class="value">${incident.category || 'N/A'}</span></div>
    <div class="field"><span class="label">Severity:</span> <span class="value">${(incident.severity || 'unknown').toUpperCase()}</span></div>
    <div class="field"><span class="label">Status:</span> <span class="value">${incident.status || 'N/A'}</span></div>
    <div class="field"><span class="label">Risk Score:</span> <span class="value">${incident.riskScore || 'N/A'}</span></div>
    <div class="field"><span class="label">Location:</span> <span class="value">${typeof incident.lat === 'number' && typeof incident.lng === 'number' ? `${incident.lat.toFixed(6)}, ${incident.lng.toFixed(6)}` : 'N/A'}</span></div>
    <div class="field"><span class="label">Address:</span> <span class="value">${incident.address || 'N/A'}</span></div>
    <div class="field"><span class="label">Reporter:</span> <span class="value">${incident.reporterName || 'Anonymous'}</span></div>
    <div class="field"><span class="label">Reported At:</span> <span class="value">${incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'N/A'}</span></div>
  </div>

  ${mapSnapshot ? `
  <div class="section">
    <h2>Incident Location</h2>
    <div class="map">
      <img src="data:image/png;base64,${mapSnapshot}" alt="Incident Location Map" />
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Audit Trail</h2>
    <div class="logs">
      ${auditLogs.map(log => `
        <div class="log-entry">
          <div><strong>${log.action}</strong> on ${log.entityType || 'event'}</div>
          <div class="log-time">${new Date(log.createdAt || log.timestamp || '').toLocaleString()} | User: ${log.user || log.userId || 'System'} | IP: ${log.ipAddress || 'N/A'}</div>
          ${log.details ? `<div>Details: ${JSON.stringify(log.details)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <div>CONFIDENTIAL - For Official Use Only</div>
    <div>IRTDP Emergency Response System</div>
  </div>
</body>
</html>`;

    await page.setContent(html);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    await page.close();

    const filename = `report-${incidentId}-${Date.now()}.pdf`;
    const filepath = path.join(REPORT_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const pdfUrl = `${PDF_BASE_URL}/files/${filename}`;

    res.json({
      success: true,
      pdfUrl,
      filename,
      message: "PDF report generated successfully"
    });

  } catch (error) {
    logger.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/health", (_, res) => res.json({ status: "ok", service: "pdf-service" }));

const PORT = process.env.PORT ?? 3007;

async function shutdown(signal) {
  logger.info("Shutdown initiated", { signal });
  try {
    if (browser) {
      await browser.close();
    }
    logger.info("Browser closed");
  } catch (err) {
    logger.error("Error during shutdown", err);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason);
  shutdown("unhandledRejection");
});

app.listen(PORT, () => logger.info(`PDF Service on :${PORT}`));