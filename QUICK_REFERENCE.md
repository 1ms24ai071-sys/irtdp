## 🚀 IRTDP - Quick Command Reference

### 📦 Installation & Startup

```bash
# 1. Clone repository
cd /path/to/irtdp

# 2. Create .env (already done, verify contents)
cat .env | grep DATABASE_URL

# 3. Start all services (takes 90 seconds)
docker compose up -d

# 4. Verify services are healthy
docker compose ps

# 5. Access services
Frontend:     http://localhost:3000  (admin@platform.local / password)
API Gateway:  http://localhost:8080
MinIO:        http://localhost:9001  (minioadmin / minioadmin123)
Grafana:      http://localhost:3001  (admin / grafana123)
```

---

## 📋 Docker Compose Commands

### Check Status
```bash
docker compose ps                    # Show container status
docker compose logs -f               # Follow all logs
docker compose logs auth-service     # Follow auth service
docker compose logs -n 50 auth-service  # Last 50 lines
```

### Control Services
```bash
docker compose up -d                   # Start all
docker compose down                    # Stop all
docker compose restart                 # Restart all
docker compose restart auth-service    # Restart one service
docker compose build auth-service      # Rebuild one service
docker compose up -d --build           # Rebuild and start all
docker compose remove auth-service     # Remove a service (not image)
```

### Debugging
```bash
docker compose exec auth-service ps aux           # Processes in container
docker compose exec auth-service npm list         # NPM dependencies
docker compose exec auth-service ls -la /app      # Files in container
docker compose exec postgres psql -U irtdp -d irtdp  # Database shell
docker compose exec redis redis-cli -a redis_secret  # Redis shell
```

### Clean & Rebuild
```bash
docker compose down -v                 # Remove volumes (delete all data!)
docker compose pull                    # Update images
docker compose build                   # Rebuild all images
docker system prune                    # Clean unused containers/images
docker volume prune                    # Clean unused volumes
```

---

## 🔌 API Gateway Routing

```
POST   /api/auth/login                 → auth-service:3001
POST   /api/auth/register              → auth-service:3001
POST   /api/auth/refresh               → auth-service:3001

GET    /api/incidents                  → incident-service:3002
POST   /api/incidents                  → incident-service:3002
PATCH  /api/incidents/{id}/status      → incident-service:3002
GET    /api/incidents/{id}             → incident-service:3002

GET    /api/hotspots                   → incident-service:3002
GET    /api/routes/{from}/to/{to}      → incident-service:3002
POST   /api/dispatch                   → incident-service:3002
GET    /api/search?q=query             → incident-service:3002

POST   /api/media/upload               → media-service:3003
GET    /api/media/{id}                 → media-service:3003
DELETE /api/media/{id}                 → media-service:3003

GET    /api/notifications              → notification-service:3005
PATCH  /api/notifications/{id}/read    → notification-service:3005

WS     /socket.io                      → incident-service:3002 (incidents)
WS     /socket.io                      → notification-service:3005 (alerts)
```

---

## 📊 Database Commands

### Connect to Database
```bash
# Via Docker
docker exec -it irtdp-postgres psql -U irtdp -d irtdp

# Or local PostgreSQL (if installed)
psql -h localhost -U irtdp -d irtdp
# Password: irtdp_secret
```

### Useful Queries
```sql
-- Check users
SELECT email, role FROM users;

-- Check incidents
SELECT id, title, risk_score, status FROM incidents LIMIT 5;

-- Check seed data loaded
SELECT COUNT(*) FROM incidents;  -- Should be 15
SELECT COUNT(*) FROM users;      -- Should be 4
SELECT COUNT(*) FROM hotspots;   -- Should be 5

-- Check recent activity
SELECT action, user_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- Check refresh tokens
SELECT user_id, expires_at FROM refresh_tokens WHERE expires_at > NOW();

-- Check media files
SELECT id, incident_id, type, status FROM media LIMIT 10;

-- Reset specific user password (admin@...)
-- Password hash: password = $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
UPDATE users SET password_hash='$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email='admin@platform.local';

-- Drop and recreate schema
\d incidents  -- Show table definition
DROP TABLE IF EXISTS incidents;
-- Then re-run scripts/schema.sql
```

---

## 💾 Redis Commands

```bash
# Connect
docker exec -it irtdp-redis redis-cli -a redis_secret

# Inside redis-cli:
KEYS *                                # List all keys
KEYS incidents:*                      # Keys matching pattern
GET incidents:list:1:20               # Get specific cache
DEL incidents:list:1:20               # Delete cache
FLUSHDB                               # Clear all (use carefully!)
MONITOR                               # Watch all commands
LLEN media:processing:queue           # Length of processing queue
LRANGE media:processing:queue 0 -1    # Show all processing jobs
INFO stats                            # Show stats
```

---

## 🔍 Testing Endpoints

### Authentication Flow
```bash
# 1. Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"TestPass123!@",
    "displayName":"Test User",
    "role":"reporter"
  }'

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"TestPass123!@"
  }'
# Copy accessToken from response

# 3. Use token (replace TOKEN)
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/incidents
```

### Create Incident
```bash
TOKEN="..."
curl -X POST http://localhost:8080/api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Incident",
    "description":"Test description",
    "category":"Assault",
    "severity":"high",
    "latitude":12.9716,
    "longitude":77.5946,
    "address":"Test Location, Bangalore"
  }'
```

### Upload Media
```bash
TOKEN="..."
INCIDENT_ID="inc-00000001"

# Use the file you want to upload
curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "incidentId=$INCIDENT_ID"
```

### Get Hotspots
```bash
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/hotspots
```

### Get Notifications
```bash
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/notifications
```

---

## 🐛 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused: 5432` | PostgreSQL not healthy | `docker compose logs postgres` |
| `CORS error` | Frontend blocked by gateway | Check ALLOWED_ORIGINS in docker-compose.yml |
| `401 Unauthorized` | Token expired or invalid | Login again and get new token |
| `Port 8080 already in use` | Another service uses port | `lsof -i :8080` and kill process |
| `Module not found` | Dependencies not installed | `npm install` in service directory |
| `Out of memory` | Docker resource limit | Increase Docker Desktop memory |
| `Webhook timeout` | Service not responding | Check service logs with `docker logs <container>` |

---

## 📈 Performance Monitoring

### Prometheus Metrics
```bash
# View all metrics (JSON API)
curl http://localhost:9090/api/v1/targets

# Query specific metric
curl 'http://localhost:9090/api/v1/query?query=gateway_requests_total'

# Get metric values over time (last 1 hour)
curl 'http://localhost:9090/api/v1/query_range?query=gateway_requests_total&start=1618000000&end=1618003600&step=60'
```

### Grafana Dashboards
```
URL: http://localhost:3001
Username: admin
Password: grafana123

Dashboards available:
- Incident Analytics
- Performance Metrics
- Resource Utilization
- API Gateway Requests
```

### View Service Metrics Endpoint
```bash
# API Gateway metrics
curl http://localhost:8080/metrics | grep gateway_

# Incident Service health
curl http://localhost:3002/health

# Media Service health
curl http://localhost:3003/health
```

---

## 📚 File Locations Reference

```
Configuration:
  .env                              # Environment variables (CRITICAL)
  docker-compose.yml                # Service definitions
  .env.example                      # Template (keep in sync with actual .env)

Database:
  scripts/schema.sql                # Create tables + indexes
  scripts/seed-data.sql             # Initial data

Frontend:
  frontend/src/App.tsx              # Main app component
  frontend/src/pages/*.tsx          # Page components
  frontend/src/utils/api.ts         # Axios instance + API methods
  frontend/src/types/index.ts       # TypeScript interfaces
  frontend/Dockerfile               # React build + nginx serving
  frontend/nginx.conf               # Nginx reverse proxy config

Services:
  services/*/src/index.ts           # Service entry point
  services/*/package.json           # Dependencies + scripts
  services/*/Dockerfile             # Build image
  services/*/tsconfig.json          # TypeScript config

Algorithms:
  services/analytics-service/src/algorithms.ts  # All 8 DAA algorithms

Monitoring:
  monitoring/prometheus.yml         # Metrics scrape config
  monitoring/grafana/datasources/   # Grafana data sources
  monitoring/grafana/dashboards/    # Grafana dashboards
  k8s/deployment.yaml               # Kubernetes manifests
```

---

## 🎯 Development Workflow

### Local Frontend Development
```bash
cd frontend
npm install
npm start

# Launches http://localhost:3000
# Frontend will call docker API gateway at localhost:8080
```

### Local Service Development
```bash
# Terminal 1: Start infrastructure
docker compose up -d postgres redis elasticsearch minio

# Terminal 2: Auth Service
cd services/auth-service
npm install
npm run dev  # Watches for changes, restarts automatically

# Terminal 3: Incident Service
cd services/incident-service
npm install
npm run dev

# Terminal 4: Test
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Running Tests
```bash
# Analytics service (has test suite)
cd services/analytics-service
npm install
npm test

# Run with coverage
npm test -- --coverage
```

---

## 🔐 Security Notes

### Credentials to Change in Production
```env
# .env file
JWT_SECRET=<change to 32+ random characters>
POSTGRES_PASSWORD=<change to strong password>
REDIS_PASSWORD=<change to strong password>
AWS_ACCESS_KEY_ID=<use AWS IAM credentials>
AWS_SECRET_ACCESS_KEY=<use AWS IAM credentials>
MINIO_ROOT_PASSWORD=<set strong password>
GF_SECURITY_ADMIN_PASSWORD=<set strong Grafana password>
```

### Default Test Credentials (CHANGE in production)
```
api@platform.local          password
officer1@police.local       password
analyst@platform.local      password
reporter@platform.local     password
```

### Security Best Practices
1. Never commit .env files with real credentials
2. Use environment-specific .env files (.env.prod, .env.staging)
3. Rotate JWT_SECRET regularly
4. Enable HTTPS/TLS in production
5. Use AWS Secrets Manager or HashiCorp Vault for secrets
6. Implement API rate limiting (already done in api-gateway)
7. Enable database backups and point-in-time recovery
8. Monitor audit_logs table for suspicious activity
9. Use strong passwords (min 12 chars, symbols, numbers)
10. Regularly update Dependencies (npm audit, npm update)

---

## 🆘 Emergency Commands

### Restart Everything
```bash
docker compose restart
# Wait 2 minutes for services to be healthy
```

### Clean Full Reset
```bash
docker compose down -v
docker compose up -d
# Wait 2 minutes for full initialization
```

### Check All Service Health
```bash
docker compose ps | grep -v healthy && echo "Some services unhealthy!"
docker compose ps | grep healthy && echo "All services healthy!"
```

### View Real-Time Logs (All Services)
```bash
docker compose logs -f --tail=100
# Ctrl+C to exit
```

### Backup Database
```bash
docker exec irtdp-postgres pg_dump -U irtdp -d irtdp > irtdp_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database from Backup
```bash
docker exec -i irtdp-postgres psql -U irtdp -d irtdp < irtdp_backup_20260407_120000.sql
```

---

## 📞 Support & Troubleshooting

**Check these first:**
1. `docker compose ps` - Verify all services running
2. `docker compose logs <service>` -Check service logs
3. `.env` file exists and has DATABASE_URL
4. Docker Desktop has 4GB RAM minimum
5. Ports 3000, 3001, 3002, 3003, 3004, 3005, 8080, 5432 not in use

**Common fixes:**
- Services not healthy? → Wait 60 seconds, then `docker compose restart`
- Cannot connect to API? → Check `docker compose logs api-gateway`
- Database errors? → Check `docker compose logs postgres`
- Memory issues? → Increase Docker Desktop RAM setting
