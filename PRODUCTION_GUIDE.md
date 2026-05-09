## 🚀 IRTDP - Production Deployment & Optimization Guide

### 📊 Project Summary

**Technology Stack:**
- Frontend: React 18 + TypeScript + Socket.io
- Backend: Node.js 20 + Express + TypeScript
- Database: PostgreSQL 15 + PostGIS 3.3
- Cache: Redis 7
- Search: Elasticsearch 8.11
- Storage: MinIO (local) / AWS S3 (production)
- Monitoring: Prometheus + Grafana
- Orchestration: Docker + Kubernetes

**Services Architecture:**
```
┌─────────────────────────┐
│   Frontend (React)      │
│   :3000 (nginx)         │
└──────────────┬──────────┘
               │
┌──────────────▼──────────────┐
│   API Gateway (Express)      │
│   :8080 (JWT + Rate Limit)   │
└──┬──────┬──────┬──────┬─────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
  Auth  Incident Media Processing
  :3001 :3002   :3003  :3004
  
  + Notification :3005

Infrastructure:
├─ PostgreSQL :5432
├─ Redis :6379
├─ Elasticsearch :9200
├─ MinIO :9000
├─ Prometheus :9090
└─ Grafana :3001
```

---

## 🎯 8 Implemented DAA Algorithms

| Algorithm | Location | Purpose | Complexity |
|-----------|----------|---------|-----------|
| **K-Means** | analytics-service | Hotspot clustering | O(i×k×n) |
| **Dijkstra** | incident-service | Shortest patrol route | O((V+E)logV) |
| **Greedy Assignment** | analytics-service | Nearest resource dispatch | O(n²) |
| **Merge Sort** | analytics-service | Incident severity ordering | O(nlogn) |
| **Binary Search** | analytics-service | Time-range incident lookup | O(logn) |
| **KMP String Match** | processing-service | Danger keyword detection | O(n+m) |
| **D&C Partition** | analytics-service | Spatial data sharding | O(nlogn) |
| **DP-TSP** | analytics-service | Optimal multi-stop patrol | O(n²2ⁿ) |

---

## 🔒 Security Hardening Checklist

### Before Deployment

```bash
# 1. Rotate all credentials
cp .env .env.production
# Edit each value:
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 20)
REDIS_PASSWORD=$(openssl rand -base64 20)
AWS_ACCESS_KEY_ID=<real AWS IAM user>
AWS_SECRET_ACCESS_KEY=<real AWS IAM secret>
```

### Environment Segmentation

```yaml
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
```

```yaml
# .env.staging
NODE_ENV=staging
LOG_LEVEL=info
```

```yaml
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
# Hide sensitive errors from clients
```

### Docker Security

```dockerfile
# Best practices to add to Dockerfiles:

# 1. Use non-root user
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

# 2. Use fixed base image versions (not 'latest')
FROM node:20.10.0-alpine

# 3. Multi-stage builds (reduce image size)
FROM node:20-alpine AS builder
# ... build steps
FROM node:20-alpine
COPY --from=builder /app/dist /app/dist

# 4. Health checks
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 5. Resource limits
# Set in docker-compose or Kubernetes:
resources:
  limits:
    cpus: '0.5'
    memory: 512M
  requests:
    cpus: '0.25'
    memory: 256M
```

### Database Security

```sql
-- 1. Create service-specific users (don't use admin)
CREATE USER auth_service WITH PASSWORD '<strong-password>';
CREATE USER incident_service WITH PASSWORD '<strong-password>';

-- 2. Grant minimal permissions
GRANT CONNECT ON DATABASE irtdp TO auth_service;
GRANT USAGE ON SCHEMA public TO auth_service;
GRANT SELECT, INSERT, UPDATE ON users TO auth_service;

-- 3. Enable SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET sslcert = '/etc/postgresql/server.crt';
ALTER SYSTEM SET sslkey = '/etc/postgresql/server.key';

-- 4. Audit important operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(100),
  user_id UUID,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Log all auth, delete, update operations

-- 5. Set row-level security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incident_visibility ON incidents
  USING (reporter_id = current_user_id OR user_role = 'admin');
```

### Redis Security

```bash
# 1. Use ACL (Redis 6+)
ACL SETUSER auth_service on >AUTH_PASSWORD +@all ~* 

# 2. Use TLS
redis-server --tls-port 6380 --cert server.crt --key server.key

# 3. Disable dangerous commands in production
redis-cli CONFIG SET lazyfree-lazy-eviction yes
redis-cli CONFIG SET timeout 0  # Disable client timeout
```

### API Security

```javascript
// In api-gateway/src/index.ts

// 1. Add rate limiting per user
const userLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:' 
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many requests' })
});

// 2. Add request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// 3. Input validation
app.use(express.json());
app.use((req, res, next) => {
  // Validate all inputs
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  next();
});

// 4. Sanitize output (remove sensitive fields)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data?.password) delete data.password;
    if (data?.passwordHash) delete data.passwordHash;
    return originalJson.call(this, data);
  };
  next();
});

// 5. Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

---

## ⚡ Performance Optimization

### Database Optimization

```sql
-- 1. Add missing indexes for common queries
CREATE INDEX CONCURRENTLY idx_incidents_reporter_created 
  ON incidents(reporter_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_media_status_created 
  ON media(status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_user_created 
  ON audit_logs(user_id, created_at DESC);

-- 2. Analyze and get stats
ANALYZE;
EXPLAIN ANALYZE SELECT * FROM incidents WHERE severity = 'high' LIMIT 10;

-- 3. Partition large tables (if >100M rows)
CREATE TABLE incidents_2024 PARTITION OF incidents
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 4. Vacuum strategy
VACUUM ANALYZE incidents;
-- Configure autovacuum
ALTER TABLE incidents SET (autovacuum_vacuum_scale_factor = 0.05);

-- 5. Connection pooling
-- Use PgBouncer between app and database
-- config:
-- [databases]
# irtdp = host=postgres port=5432 dbname=irtdp
```

### Caching Strategy

```javascript
// 1. Cache layers
// L1: In-memory (fast, small)
// L2: Redis (medium, distributed)
// L3: Database (slow, persistent)

// 2. Implement cache-aside pattern
async function getIncidents(page, limit) {
  const cacheKey = `incidents:${page}:${limit}`;
  
  // Try L2 cache (Redis)
  let cached = await redis.get(cacheKey);
  if (cached) {
    cache.hits++;
    return JSON.parse(cached);
  }
  
  // Cache miss, fetch from DB
  const incidents = await db.query(
    'SELECT * FROM incidents OFFSET $1 LIMIT $2',
    [(page-1)*limit, limit]
  );
  
  // Store in L2 cache (5 minute TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(incidents.rows));
  
  cache.misses++;
  return incidents.rows;
}

// 3. Cache invalidation on writes
app.post('/api/incidents', async (req, res) => {
  // Create incident...
  
  // Invalidate list cache
  await redis.del('incidents:*');
  
  res.json(newIncident);
});

// 4. Monitor cache effectiveness
app.get('/metrics/cache', (req, res) => {
  const hitRate = cache.hits / (cache.hits + cache.misses);
  res.json({ 
    hits: cache.hits, 
    misses: cache.misses, 
    hitRate: (hitRate * 100).toFixed(2) + '%' 
  });
});
```

### Frontend Optimization

```javascript
// In frontend/src/App.tsx

// 1. Code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const IncidentDetail = React.lazy(() => import('./pages/IncidentDetail'));

// 2. Memoization
const IncidentList = React.memo(({ incidents }) => {
  return incidents.map(inc => <IncidentCard key={inc.id} {...inc} />);
});

// 3. Pagination instead of infinite scroll
const [page, setPage] = useState(1);
const { data } = useSWR(`/api/incidents?page=${page}`, fetcher);

// 4. Image optimization
<img src={src} srcSet={`${src}?w=300 300w, ${src}?w=600 600w`} />

// 5. Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

// 6. Service Workers for offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 📈 Scalability Improvements

### Horizontal Scaling with Kubernetes

```yaml
# k8s/deployment.yaml (complete example)

apiVersion: apps/v1
kind: Deployment
metadata:
  name: incident-service
spec:
  replicas: 3  # Horizontal scaling
  selector:
    matchLabels:
      app: incident-service
  template:
    metadata:
      labels:
        app: incident-service
    spec:
      containers:
      - name: incident-service
        image: irtdp/incident-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: incident-service
spec:
  selector:
    app: incident-service
  ports:
  - port: 3002
    targetPort: 3002
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: incident-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: incident-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

```javascript
// 1. Read replicas
// Point read-only queries to replica
const readDb = new Pool({
  connectionString: process.env.READ_REPLICA_URL
});

// 2. Sharding
function getIncidentShard(incidentId) {
  const hash = incidentId.charCodeAt(0);
  const shard = hash % 4;  // 4 shards
  return `incident_service_${shard}`;
}

// 3. Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Monitor pool
setInterval(() => {
  console.log(`Active: ${pool._activeCount}, Idle: ${pool._idleCount}`);
}, 10000);
```

### Message Queue for Async Processing

```javascript
// Replace direct Redis queues with Bull (production-grade)
import Bull from 'bull';

const mediaQueue = new Bull('media-processing', {
  redis: {
    host: 'redis',
    port: 6379,
    password: process.env.REDIS_PASSWORD
  }
});

// Produce
app.post('/api/media/upload', async (req, res) => {
  const jobId = uuidv4();
  await mediaQueue.add({ mediaId, s3Key }, {
    jobId,
    priority: severity === 'critical' ? 10 : 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  });
  res.json({ jobId });
});

// Consume
mediaQueue.process(20, async (job) => {
  const { mediaId } = job.data;
  job.progress(0);
  
  // Process...
  job.progress(50);
  
  // Done
  job.progress(100);
  return { processed: mediaId };
});

// Track
mediaQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
mediaQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});
```

### Elasticsearch for Full-Text Search

```javascript
// Current: Only incident title is searchable
// Improvement: Index full-text content

const esMapping = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title: { type: 'text', analyzer: 'standard' },
      description: { type: 'text', analyzer: 'standard' },
      category: { type: 'keyword' },
      severity: { type: 'keyword' },
      location: {
        type: 'geo_point',
        format: 'lat,lon'
      },
      createdAt: { type: 'date' },
      keywords: { type: 'keyword' }
    }
  }
};

// Search with filters
async function searchIncidents(query, filters = {}) {
  const results = await es.search({
    index: 'incidents',
    body: {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^2', 'description', 'keywords']
              }
            }
          ],
          filter: [
            { term: { severity: filters.severity } },
            {
              range: {
                location: {
                  gte: filters.lat - 0.05,
                  lte: filters.lat + 0.05
                }
              }
            }
          ]
        }
      }
    }
  });
  return results;
}
```

---

## 🔍 Monitoring & Observability

### Prometheus Metrics (Already Implemented)

```javascript
// Current metrics:
// gateway_requests_total{method, route, status}
// gateway_request_duration_seconds{method, route}

// Add more metrics in services:
import { Counter, Histogram } from 'prom-client';

const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits'
});

const cacheSize = new Gauge({
  name: 'cache_size_bytes',
  help: 'Cache size in bytes'
});
```

### Logging Best Practices

```javascript
// Use structured logging
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Log with context
logger.info('Incident created', {
  incidentId: id,
  userId: reporterId,
  severity,
  timestamp: new Date(),
  duration_ms: Date.now() - startTime
});

// Centralized logging (send to ELK)
const transport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: { node: 'http://elasticsearch:9200' },
  index: 'logs-irtdp'
});
logger.add(transport);
```

### Alerting Rules

```yaml
# monitoring/alerts.yml

groups:
- name: irtdp-alerts
  rules:
  # Service down
  - alert: ServiceDown
    expr: up{job="irtdp"} == 0
    for: 1m
    annotations:
      summary: "{{ $labels.instance }} is down"
  
  # High error rate
  - alert: HighErrorRate
    expr: rate(gateway_requests_total{status=~"5.."}[5m]) > 0.05
    annotations:
      summary: "Error rate > 5%"
  
  # Database connection pool full
  - alert: DBConnectionPoolFull
    expr: db_connection_pool_used / db_connection_pool_max > 0.9
    annotations:
      summary: "DB connection pool 90% full"
  
  # Cache hit rate too low
  - alert: LowCacheHitRate
    expr: |
      cache_hits_total / (cache_hits_total + cache_misses_total) < 0.6
    annotations:
      summary: "Cache hit rate < 60%"
  
  # Slow query
  - alert: SlowQuery
    expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 1
    annotations:
      summary: "p95 query time > 1 second"
```

---

## 📦 CI/CD Pipeline Setup

```yaml
# .github/workflows/test-build-deploy.yml

name: Test Build Deploy
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_DB: test_irtdp
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Test
        run: npm test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: docker compose build
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USER }} --password-stdin
          docker tag irtdp-api-gateway:latest myregistry.com/irtdp-api-gateway:${{ github.sha }}
          docker push myregistry.com/irtdp-api-gateway:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api-gateway \
            api-gateway=myregistry.com/irtdp-api-gateway:${{ github.sha }}
          kubectl rollout status deployment/api-gateway
```

---

## 🔄 Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backups

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database
docker exec irtdp-postgres pg_dump -U irtdp -d irtdp | \
  gzip > $BACKUP_DIR/irtdp_db_$DATE.sql.gz

# MinIO (S3)
docker exec irtdp-minio mc mirror \
  local/incident-media \
  /backups/s3_mirror_$DATE/

# Elasticsearch
curl -H "Content-Type: application/json" \
  -X PUT "http://localhost:9200/_snapshot/backup" \
  -d '{"type":"fs","settings":{"location":"/backups/es_snapshot_'$DATE'"}}'

# Retention policy
find $BACKUP_DIR -name "irtdp_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Steps

```bash
# 1. Restore database
docker exec -i irtdp-postgres psql -U irtdp -d irtdp \
  < irtdp_db_20260407_120000.sql.gz

# 2. Verify integrity
docker exec irtdp-postgres psql -U irtdp -d irtdp \
  -c "SELECT COUNT(*) FROM incidents;"

# 3. Restore MinIO data
docker exec irtdp-minio mc mirror \
  /backups/s3_mirror_20260407_120000/ \
  local/incident-media

# 4. Restart all services
docker compose restart
```

---

## 💡 Advanced Features to Implement

### Real-Time Collaboration
```javascript
// Implement conflict resolution for concurrent incident updates
import * as Y from 'yjs';

const incidents = new Y.Map();
const provider = new WebsocketProvider(
  'ws://localhost:1234',
  'incidents',
  incidents
);

incidents.observe(event => {
  // Real-time sync with other users
  console.log('Incident changed:', event.changes);
});
```

### Machine Learning Integration
```javascript
// Integrate ML for predictive hotspot analysis
import tf from '@tensorflow/tfjs';

async function predictHotspots(historicalData) {
  const model = await tf.loadLayersModel('indexeddb://hotspot-predictor');
  const predictions = model.predict(tf.tensor(historicalData));
  return predictions.data();
}
```

### Geofencing & Location Services
```javascript
// Implement geofences for emergency zones
function checkGeofence(lat, lng, fenceCoords) {
  // Point-in-polygon check
  let inside = false;
  for (let i = 0, j = fenceCoords.length - 1; i < fenceCoords.length; j = i++) {
    if ((fenceCoords[i][1] > lng) !== (fenceCoords[j][1] > lng) &&
        lng < (fenceCoords[j][0] - fenceCoords[i][0]) * (lng - fenceCoords[i][1]) / 
        (fenceCoords[j][1] - fenceCoords[i][1]) + fenceCoords[i][0]) {
      inside = !inside;
    }
  }
  return inside;
}
```

---

## 🧠 Testing Strategy

### Unit Tests
```javascript
// services/analytics-service/src/algorithms.test.ts
describe('K-Means Clustering', () => {
  it('should cluster incidents correctly', () => {
    const incidents = [
      { lat: 12.97, lng: 77.59, severity: 'high' },
      { lat: 12.98, lng: 77.60, severity: 'high' },
      { lat: 13.05, lng: 77.70, severity: 'low' }
    ];
    
    const clusters = kMeansClustering(incidents, 2);
    
    expect(clusters).toHaveLength(2);
    expect(clusters[0].incidents.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```javascript
describe('Incident API', () => {
  it('should create and retrieve incident', async () => {
    const token = await loginUser('admin@platform.local', 'password');
    
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test',
        severity: 'high',
        latitude: 12.97,
        longitude: 77.59
      });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    
    const getRes = await request(app)
      .get(`/api/incidents/${res.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe('Test');
  });
});
```

### Load Testing
```bash
# Install k6
npm install -g k6

# Create test scenario
# performance-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100,  // 100 virtual users
  duration: '5m'  // 5 minutes
};

export default function() {
  let res = http.get('http://localhost:8080/api/incidents');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}

# Run test
k6 run performance-test.js
```

---

## ✅ Production Deployment Checklist

- [ ] All secrets in AWS Secrets Manager / HashiCorp Vault
- [ ] Database backups automated (daily, retention 30 days)
- [ ] HTTPS/TLS certificates valid and auto-renewing
- [ ] Network policies and firewall rules configured
- [ ] Kubernetes resource quotas and limits set
- [ ] Monitoring and alerting configured
- [ ] Log aggregation to central repository
- [ ] Load testing completed and passed
- [ ] Security audit completed
- [ ] Documentation updated and reviewed
- [ ] No hardcoded credentials or secrets in code
- [ ] All dependencies up-to-date and patched
- [ ] Database connection pooling configured
- [ ] CDN configured for static assets
- [ ] DDoS protection enabled
- [ ] Rate limiting tuned for production load
- [ ] Disaster recovery procedures tested
- [ ] Incident response procedures documented
- [ ] SLAs defined and monitored
- [ ] Compliance requirements verified (GDPR, etc.)

---

## 📚 Additional Resources

- PostGIS Documentation: https://postgis.net/documentation/
- Elasticsearch Guide: https://www.elastic.co/guide/
- Prometheus Best Practices: https://prometheus.io/docs/practices/
- Kubernetes Official Docs: https://kubernetes.io/docs/
- Node.js Performance: https://nodejs.org/en/docs/guides/simple-profiling/
