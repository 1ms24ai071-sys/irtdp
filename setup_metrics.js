const fs = require('fs');

const injectMetricsAndTracing = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Inject prom-client if not present
  if (!code.includes('prom-client')) {
    code = code.replace(/import express[^;]*;/, "$&\nimport promClient from 'prom-client';");
    
    // Fallback if the first regex fails (e.g. for commonjs)
    if (!code.includes('prom-client')) {
      code = "import promClient from 'prom-client';\n" + code;
    }

    code = code.replace(/const app = express\(\);/, `const app = express();\n\n// Prometheus Metrics Setup\nconst collectDefaultMetrics = promClient.collectDefaultMetrics;\ncollectDefaultMetrics({ register: promClient.register });\n\napp.get('/metrics', async (req, res) => {\n  res.set('Content-Type', promClient.register.contentType);\n  res.end(await promClient.register.metrics());\n});\n`);
  }

  // Inject x-request-id if not present
  if (!code.includes('x-request-id')) {
    code = code.replace(/app\.use\(express\.json\([^)]*\)\);/g, `app.use(express.json());\napp.use((req, res, next) => {\n  req.id = req.headers['x-request-id'] || require('uuid').v4();\n  res.setHeader('x-request-id', req.id);\n  // Pass to logger conditionally if desired\n  next();\n});`);
  }

  fs.writeFileSync(filePath, code);
};

injectMetricsAndTracing('services/incident-service/src/index.ts');
injectMetricsAndTracing('services/auth-service/src/index.ts');
injectMetricsAndTracing('services/media-service/src/index.ts');

// Ensure API Gateway injects x-request-id
let gateway = fs.readFileSync('services/api-gateway/src/index.ts', 'utf8');
if (!gateway.includes('x-request-id')) {
  gateway = gateway.replace(/app\.use\(helmet\(\)\);/, `app.use(helmet());\nimport { v4 as uuidv4 } from "uuid";\napp.use((req, res, next) => {\n  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();\n  res.setHeader('x-request-id', req.headers['x-request-id']);\n  next();\n});`);
  fs.writeFileSync('services/api-gateway/src/index.ts', gateway);
}

console.log("Metrics injected.");
