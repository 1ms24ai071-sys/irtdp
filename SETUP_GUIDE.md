## IRTDP - Complete Setup & Debugging Guide

**Last Updated**: April 2026  
**Stack**: Node.js 20, TypeScript, React 18, PostgreSQL + PostGIS, Docker, Kubernetes  

---

## 📋 Prerequisites

Before you start, ensure you have the following installed:

```bash
# Check installations:
node --version          # v20+
npm --version           # v10+
docker --version        # v24+
docker compose version  # v2.20+
git --version          # Any recent version
```

### Required Tools Installation (if missing)

**Windows (PowerShell)**:
```powershell
# Using Chocolatey
choco install nodejs docker-desktop

# Or download manually:
# Node.js: https://nodejs.org/
# Docker Desktop: https://www.docker.com/products/docker-desktop
```

**macOS**:
```bash
brew install node docker
# Download Docker Desktop: https://www.docker.com/products/docker-desktop
```

**Linux (Ubuntu/Debian)**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
```

---

## 🚀 Quick Start (5-10 minutes)

### Step 1: Clone & Navigate
```bash
cd /path/to/irtdp
# Verify .env file exists (should have been created)
cat .env
```

### Step 2: Start All Services
```bash
# Start services in detached mode
docker compose up -d

# Wait 60-90 seconds for services to initialize...
# Check service status
docker compose ps
```

### Step 3: Verify Services Are Running
```bash
# Wait for all services to be healthy (Health column should show 'healthy')
docker compose logs -f api-gateway  # Should show "API Gateway on :8080"

# Press Ctrl+C to exit logs
```

### Step 4: Access Services

| Service | URL | Login | Password |
|---------|-----|-------|----------|
| **Frontend** | http://localhost:3000 | admin@platform.local | password |
| **API Gateway** | http://localhost:8080 | - | - |
| **MinIO Console** | http://localhost:9001 | minioadmin | minioadmin123 |
| **Grafana** | http://localhost:3001 | admin | grafana123 |
| **Prometheus** | http://localhost:9090 | - | - |

### Step 5: Test API Connection
```bash
# Test auth service
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@platform.local","password":"password"}'

# Should return access token and refresh token
```

---

## 📦 Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                  :3000 (nginx reverse proxy)             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Express)                       │
│           :8080 (Rate Limit + CORS + Auth)              │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
 Auth      Incident    Media    Processing  Notif
 Service   Service    Service   Service    Service
 :3001     :3002      :3003      :3004     :3005

Base Infrastructure:
├─ PostgreSQL + PostGIS (:5432)
├─ Redis (:6379)
├─ Elasticsearch (:9200)
├─ MinIO / S3 (:9000)
├─ Prometheus (:9090)
└─ Grafana (:3001)
```

---

## 🔧 Individual Service Details

### Auth Service (:3001)
- **Purpose**: JWT generation, token refresh, user registration, RBAC
- **Database**: PostgreSQL (users, refresh_tokens, audit_logs)
- **Key Endpoints**:
  - `POST /register` - Create new account
  - `POST /login` - Get access + refresh tokens
  - `POST /refresh` - Refresh expired access token
  - `POST /verify` - Verify token (internal gateway use)
  - `GET /health` - Health check

### Incident Service (:3002)
- **Purpose**: CRUD incidents, K-Means hotspot detection, Dijkstra routing, Greedy dispatch
- **Dependencies**: PostgreSQL, Redis, Elasticsearch, Auth Service
- **Key Endpoints**:
  - `GET /api/incidents` - List incidents (paginated, cached)
  - `POST /api/incidents` - Report new incident (auto risk scoring)
  - `GET /api/hotspots` - Get crime hotspots (K-Means clusters)
  - `GET /api/routes` - Get optimal patrol routes (Dijkstra)
  - `POST /api/dispatch` - Assign resources (Greedy algorithm)
  - `WS /socket.io` - Real-time incident updates

### Media Service (:3003)
- **Purpose**: Upload, store (MinIO), process, and retrieve media (images/videos)
- **Dependencies**: PostgreSQL, Redis, MinIO, Auth Service
- **Key Endpoints**:
  - `POST /api/media/upload` - Upload media for incident
  - `GET /api/media/:id` - Get media (includes S3 presigned URL)
  - `DELETE /api/media/:id` - Delete media
  - `GET /api/media/:id/thumbnail` - Get thumbnail (if video)

### Processing Service (:3004)
- **Purpose**: Background job queue, video transcoding, image optimization, moderation
- **Dependencies**: PostgreSQL, Redis, Elasticsearch, MinIO
- **Note**: This is a background worker (no HTTP endpoints typically, uses Redis queues)

### Notification Service (:3005)
- **Purpose**: Send alerts, WebSocket connections for real-time notifications
- **Dependencies**: PostgreSQL, Redis
- **Key Endpoints**:
  - `GET /api/notifications` - Get user notifications
  - `PATCH /api/notifications/:id/read` - Mark as read
  - `WS /socket.io` - WebSocket for real-time alerts

### Analytics Service
- **Purpose**: Algorithm implementations (K-Means clustering, Dijkstra, etc.)
- **Location**: `services/analytics-service/src/algorithms.ts`
- **Status**: Shared library used by incident-service and processing-service

---

## 📊 Database Setup

### Schema Overview
```sql
-- Core Tables
users                    -- Users with RBAC (reporters, police, analysts, admin)
incidents               -- Crime incidents with PostGIS location geometry
media                   -- Images/videos attached to incidents
media_processing        -- Processing metadata (thumbnails, transcripts, flags)
hotspots                -- Pre-computed K-Means clusters
resources               -- Police units, ambulances, fire trucks
resource_assignments    -- Assignment of resources to incidents (Greedy dispatch)
audit_logs              -- All user actions for compliance
notifications           -- Real-time alerts to users
refresh_tokens          -- Secure JWT refresh tokens
```

### Verify Database Setup
```bash
# Connect to PostgreSQL
docker exec -it irtdp-postgres psql -U irtdp -d irtdp

# Inside psql:
\dt                              -- List all tables
\d incidents                     -- Show incidents table schema
SELECT COUNT(*) FROM users;      -- Should return 4
SELECT COUNT(*) FROM incidents;  -- Should return 15
SELECT COUNT(*) FROM hotspots;   -- Should return 5
\q                               -- Exit
```

### Manual Schema Reset (if needed)
```bash
# Drop and recreate schema from scratch
docker exec -it irtdp-postgres psql -U irtdp -d irtdp < ./scripts/schema.sql
docker exec -it irtdp-postgres psql -U irtdp -d irtdp < ./scripts/seed-data.sql

# Verify
docker exec -it irtdp-postgres psql -U irtdp -d irtdp -c "SELECT COUNT(*) FROM incidents;"
```

---

## 🐳 Docker Commands

### View Status
```bash
# Show all running containers
docker compose ps

# Show detailed logs for specific service
docker compose logs -f auth-service      # Follow logs
docker compose logs auth-service -n 100  # Last 100 lines

# View logs for all services
docker compose logs
```

### Restart Services
```bash
# Restart single service
docker compose restart auth-service

# Restart all services
docker compose restart

# Rebuild and restart a service
docker compose up -d --build auth-service
```

### Stop Services
```bash
# Stop all (keep volumes)
docker compose down

# Stop and remove volumes (clean wipe)
docker compose down -v

# Stop specific service
docker compose stop auth-service
```

### Access Service Shells
```bash
# Connect to PostgreSQL
docker exec -it irtdp-postgres psql -U irtdp -d irtdp

# Access Redis CLI
docker exec -it irtdp-redis redis-cli -a redis_secret

# Connect to auth-service container
docker exec -it irtdp-auth /bin/sh

# View container filesystem
docker exec -it irtdp-auth ls -la /app/dist/
```

---

## 🏗️ Running Services Locally (Without Docker)

### Prerequisites
```bash
# Install Node.js 20+ and npm
node --version  # Should be v20+

# Install PostgreSQL locally (or skip and use Docker's postgres)
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql postgresql-contrib
```

### Start PostgreSQL (Docker)
```bash
# Keep only PostgreSQL running locally
docker compose up -d postgres redis elasticsearch minio

# Verify they're ready
docker compose ps
```

### Start Auth Service Locally
```bash
cd services/auth-service

# Install dependencies (if not already installed)
npm install

# Build TypeScript
npm run build

# Start in development mode (with auto-reload)
npm run dev

# In another terminal, test:
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@platform.local","password":"password"}'
```

### Start Incident Service Locally
```bash
cd services/incident-service

npm install
npm run build
npm run dev

# Test:
curl http://localhost:3002/health
```

### Start Frontend Locally
```bash
cd frontend

npm install
npm start

# Opens http://localhost:3000 in browser
```

---

## 🐛 Debugging

### Common Issues & Solutions

#### ❌ "docker: command not found"
```bash
# Docker not installed
# macOS: brew install docker (requires Docker Desktop)
# Windows: Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Linux: sudo apt-get install docker.io docker-compose
```

#### ❌ "Port 8080 is already in use"
```bash
# Find what's using port 8080
Windows: netstat -ano | findstr :8080
macOS/Linux: lsof -i :8080

# Kill the process or change port in docker-compose.yml
# Then: docker compose up -d
```

#### ❌ "Cannot connect to Docker daemon"
```bash
# Docker daemon not running
# macOS/Windows: Start Docker Desktop application
# Linux: sudo systemctl start docker

# After starting:
docker ps  # Should show list of containers
```

#### ❌ "Database connection refused"
```bash
# PostgreSQL might not be ready yet
# Check:
docker compose ps postgres  # Should show HEALTHY

# If not healthy, wait more or restart:
docker compose restart postgres
docker logs -f irtdp-postgres  # Check logs for errors
```

#### ❌ "Auth service failed to start"
```bash
# Check auth-service logs
docker logs -f irtdp-auth

# Common causes:
# 1. DATABASE_URL not set correctly → check .env
# 2. PostgreSQL not healthy → wait for postgres
# 3. Redis not accessible → check Redis is running

# Restart all dependencies
docker compose restart postgres redis
docker compose restart auth-service
```

#### ❌ "EADDRINUSE: Port 3000 already in use"
```bash
# Kill process using port 3000
Windows: netstat -ano | findstr :3000 && taskkill /PID <PID>
macOS/Linux: lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill

# Or change port in frontend/.package.json or nginx.conf
```

#### ❌ "Elasticsearch failed to start (memory)"
```bash
# Elasticsearch needs at least 2GB RAM
# Increase Docker Desktop memory:
# macOS/Windows: Docker Desktop → Preferences → Resources → Memory: 4GB
# Linux: Already using host resources, check available RAM

# After increasing:
docker compose restart elasticsearch
```

#### ❌ "MinIO health check failed"
```bash
# MinIO might be slow to start
docker compose logs irtdp-minio

# Restart MinIO
docker compose restart minio minio-init

# Wait 30 seconds for minio-init to complete
docker compose ps minio minio-init  # Should both be up
```

#### ❌ "TypeScript compilation errors in services"
```bash
# Check specific service for errors
cd services/auth-service
npm install  # Ensure all dependencies installed
npm run build  # Build and show errors

# Fix missing types
npm install --save-dev @types/<missing-package>

# If errors persist, check tsconfig.json
cat tsconfig.json
```

#### ❌ "Frontend shows "API error" or blank"
```bash
# Check console errors (F12 → Console tab)
# Common issues:
# 1. CORS error → API Gateway ALLOWED_ORIGINS not set correctly
# 2. API not responding → Check api-gateway is running:
#    curl http://localhost:8080/health

# Reset frontend:
docker compose restart frontend
# Or from localhost:
cd frontend && npm start
```

#### ❌ "JWT token expired"
```bash
# Delete localStorage and login again
# Browser Console:
localStorage.clear()

# For development, increase JWT_EXPIRE_IN in .env
# Then restart services:
# docker compose restart auth-service incident-service
```

### Debugging Tools & Commands

#### Enable Verbose Logging
```bash
# In docker-compose.yml, add to each service:
environment:
  LOG_LEVEL: debug
  DEBUG: *

# Then restart
docker compose up -d --build
```

#### Database Debugging
```bash
# Connect directly
docker exec -it irtdp-postgres psql -U irtdp -d irtdp

# Check incident data
SELECT id, title, risk_score, created_at FROM incidents LIMIT 5;

# Check for errors in recent operations
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

# Check user sessions
SELECT * FROM refresh_tokens WHERE expires_at > NOW();
```

#### Redis Debugging
```bash
# Connect to Redis
docker exec -it irtdp-redis redis-cli -a redis_secret

# Inside redis-cli:
KEYS *                          # List all keys
GET incidents:list:1:20         # Check incident cache
DEL incidents:list:1:20         # Clear incident cache
MONITOR                         # Watch all commands in real-time
```

#### Network Debugging
```bash
# Test inter-service communication from gateway
docker exec irtdp-gateway curl -v http://auth-service:3001/health

# Test from your machine
curl -v http://localhost:8080/health

# Check DNS resolution
docker exec irtdp-gateway nslookup auth-service
```

#### Metrics & Performance
```bash
# View Prometheus metrics endpoint
curl http://localhost:9090/api/v1/targets

# Get current request metrics
curl http://localhost:8080/metrics | grep gateway_requests_total

# View Grafana dashboards
# Open http://localhost:3001 → Sign in (admin/grafana123)
# See pre-configured incident and performance dashboards
```

---

## 📝 Running Database Migrations

### Initial Schema & Seed Data
```bash
# Schema and seed data are loaded automatically when PostgreSQL container starts
# They're injected via docker-compose volumes:
#   - ./scripts/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
#   - ./scripts/seed-data.sql:/docker-entrypoint-initdb.d/02-seed.sql

# Verify they loaded:
docker exec irtdp-postgres psql -U irtdp -d irtdp -c "SELECT COUNT(*) FROM users;"
```

### Manual Seed Data Reset
```bash
# If you want to clear and reseed everything:
docker compose down -v  # Remove all volumes
docker compose up -d postgres redis  # Start fresh postgres
# Wait for postgres to be healthy
sleep 30

# Load schema and seed
docker exec irtdp-postgres psql -U irtdp -d irtdp < ./scripts/schema.sql
docker exec irtdp-postgres psql -U irtdp -d irtdp < ./scripts/seed-data.sql

# Verify
docker exec irtdp-postgres psql -U irtdp -d irtdp -c "SELECT COUNT(*) FROM incidents;"  # Should be 15
```

### Add Custom Users
```bash
# Connect to DB
docker exec -it irtdp-postgres psql -U irtdp -d irtdp

# Insert new user (password = "password" hashed with bcrypt)
INSERT INTO users (email, password_hash, role, display_name) VALUES
  ('newuser@example.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'analyst',
   'New Analyst');

# Verify
SELECT email, role FROM users;
\q
```

---

## 🧪 Testing Services

### Run Tests in Analytics Service
```bash
# The analytics service has algorithm tests
cd services/analytics-service

npm install
npm test

# Should show test results for:
# ✓ K-Means Clustering
# ✓ Dijkstra's Shortest Path
# ✓ Greedy Resource Assignment
# ✓ Merge Sort
# ✓ Binary Search
```

### Integration Testing
```bash
# Test auth flow
1. Register: curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!@","displayName":"Test User","role":"reporter"}'

2. Login: curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!@"}'
     # Copy accessToken from response

3. Use token: curl -H "Authorization: Bearer <TOKEN>" \
     http://localhost:8080/api/incidents

# Test incident creation
4. curl -X POST http://localhost:8080/api/incidents \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "title":"Test Incident",
       "severity":"high",
       "latitude":12.9716,
       "longitude":77.5946,
       "address":"Test Location",
       "description":"Test incident for debugging"
     }'
```

---

## 🔍 Performance & Scalability Improvements

### Caching Strategy
```bash
# Current: Redis caches incident lists
# Add more cache keys as needed:

# In incident-service index.ts, add:
const cacheKey = `incidents:${userId}:${page}:${limit}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

# Cache incidents list for 5 minutes:
await redis.setex(cacheKey, 300, JSON.stringify(incidents));
```

### Database Optimization
```bash
# Existing indexes should cover common queries:
- idx_incidents_location (PostGIS spatial index for hotspot queries)
- idx_incidents_severity (for filtering by severity)
- idx_incidents_status (for status filtering)
- idx_incidents_created (for pagination)

# If you notice slow queries, add more indexes:
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX idx_media_incident ON media(incident_id);
```

### API Gateway Rate Limiting
```bash
# Current limits (express-rate-limit):
- Global: 200 requests/minute per IP
- Upload: 20 requests/minute per IP
- Login: 10 attempts per 15 minutes

# Adjust in services/api-gateway/src/index.ts or push to .env
```

### Horizontal Scaling (Kubernetes)
```bash
# Kubernetes manifests are in k8s/deployment.yaml
# To scale a service:
kubectl set image deployment/incident-service \
  incident-service=<registry>/incident-service:latest

kubectl scale deployment incident-service --replicas=3
```

---

## 📚 Useful References

### Database Connection String (Docker internal)
```
postgresql://irtdp:irtdp_secret@postgres:5432/irtdp
```

### Service Discovery (Docker DNS)
```
- http://auth-service:3001
- http://incident-service:3002
- http://media-service:3003
- http://processing-service:3004
- http://notification-service:3005
- http://postgres:5432
- http://redis:6379
- http://elasticsearch:9200
- http://minio:9000
```

### Default Credentials
```
Database:
  User: irtdp
  Password: irtdp_secret

Redis:
  Password: redis_secret

MinIO:
  User: minioadmin
  Password: minioadmin123

Grafana:
  User: admin
  Password: grafana123

Test Users (password = "password"):
  admin@platform.local (admin)
  officer1@police.local (police)
  analyst@platform.local (analyst)
  reporter@platform.local (reporter)
```

### Important Files
```
Configuration:
  .env                          # Environment variables
  docker-compose.yml            # Service definitions
  monitoring/prometheus.yml     # Metrics collection
  monitoring/grafana/           # Dashboards and datasources

Database:
  scripts/schema.sql            # Database schema
  scripts/seed-data.sql         # Sample data

Frontend:
  frontend/src/App.tsx          # Main React component
  frontend/src/pages/           # Page components
  frontend/src/utils/api.ts     # API client with interceptors
  frontend/Dockerfile           # React build and nginx setup

Services:
  services/*/src/index.ts       # Main service entry point
  services/*/package.json       # Dependencies and scripts
```

---

## 🎯 Next Steps

1. **Start Services**: `docker compose up -d`
2. **Access Frontend**: http://localhost:3000
3. **Login**: admin@platform.local / password
4. **Create Incident**: Dashboard → Report Incident
5. **View Hotspots**: Dashboard → Hotspot Map
6. **Monitor Performance**: Grafana → http://localhost:3001
7. **Check Logs**: `docker compose logs -f`

---

## ✅ Verification Checklist

- [ ] Docker running (`docker ps` shows containers)
- [ ] All services healthy (`docker compose ps` all say "healthy")
- [ ] Frontend accessible (http://localhost:3000)
- [ ] Can login with admin@platform.local / password
- [ ] Can create incident from frontend
- [ ] Incidents appear in dashboard
- [ ] Hotspots calculated and displayed
- [ ] MinIO console accessible (http://localhost:9001)
- [ ] Can upload media to incident
- [ ] Grafana dashboards working (http://localhost:3001)
- [ ] Database has 15 seed incidents (`SELECT COUNT(*) FROM incidents;`)

---

**⚠️ Production Deployment Notes**:
- Change JWT_SECRET to a strong random 32+ character string
- Use environment-specific .env files (dev, staging, prod)
- Configure proper HTTPS/TLS certificates
- Set up persistent volumes for PostgreSQL and Elasticsearch
- Configure CloudFront or CDN for media delivery
- Implement database backups and recovery procedures
- Use Secret management (AWS Secrets Manager, HashiCorp Vault)
- Enable audit logging for compliance
- Set up monitoring alerts in Grafana
