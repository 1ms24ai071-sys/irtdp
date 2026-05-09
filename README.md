# Real-Time Incident Detection Platform (IRTDP)

Production-ready microservices platform for crime incident detection, hotspot analysis,
and emergency resource dispatch — built with a full suite of DAA algorithms.

## Quick Start

```bash
# 1. Start everything
docker compose up -d

# 2. Wait ~60s, then open:
#   Frontend  →  http://localhost:3000
#   API       →  http://localhost:8080
#   MinIO     →  http://localhost:9001  (admin / minioadmin123)
#   Grafana   →  http://localhost:3001  (admin / grafana123)
#   Prometheus→  http://localhost:9090
```

## Login Credentials

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| Admin    | admin@platform.local       | password    |
| Police   | officer1@police.local      | password    |
| Analyst  | analyst@platform.local     | password    |
| Reporter | reporter@platform.local    | password    |

## DAA Algorithms

| Algorithm           | File                    | Purpose                     |
|---------------------|-------------------------|-----------------------------|
| K-Means Clustering  | analytics-service/src/  | Crime hotspot detection      |
| Dijkstra's          | analytics-service/src/  | Shortest police route        |
| Greedy Assignment   | analytics-service/src/  | Nearest resource dispatch    |
| Merge Sort (D&C)    | analytics-service/src/  | Severity/time ordering       |
| Binary Search       | analytics-service/src/  | Time-range incident lookup   |
| KMP String Match    | analytics-service/src/  | Danger keyword detection     |
| D&C Partitioning    | analytics-service/src/  | Geospatial data sharding     |
| DP-TSP              | analytics-service/src/  | Optimal multi-stop patrol    |

## Run Tests

```bash
cd services/analytics-service
npm install
npm test
```

## Architecture

```
React Frontend
      |
API Gateway :8080  (JWT verify, rate limit, routing)
      |
  ┌───┴─────────────────────────────────────┐
  |            |           |                 |
Auth:3001  Incident:3002  Media:3003  Notify:3005
               |              |
         Processing Worker  (async Redis queue)
               |
    PostgreSQL · Redis · Elasticsearch · MinIO
               |
     Prometheus + Grafana
```

## API Endpoints

```
POST   /api/auth/login              Sign in, get JWT
POST   /api/auth/register           Create account
POST   /api/auth/refresh            Refresh access token

POST   /api/incidents               Report new incident
GET    /api/incidents               List (paginated, sorted by Merge Sort)
GET    /api/incidents/:id           Detail with media + transcript
PATCH  /api/incidents/:id/status    Update status (police/admin)

POST   /api/media/upload            Upload image/audio/video
GET    /api/media/:id               Get + presigned URL + AI transcript

GET    /api/hotspots?k=5            K-Means cluster results
GET    /api/routes                  Greedy resource assignments
GET    /api/search?q=robbery        Elasticsearch full-text search
```

## Tech Stack

- **Backend**: Node.js 20 + TypeScript + Express
- **Frontend**: React 18 + TypeScript
- **Databases**: PostgreSQL/PostGIS, Redis, Elasticsearch
- **Storage**: MinIO (local) / AWS S3 (production)
- **Infra**: Docker Compose + Kubernetes (HPA, rolling updates)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## Media Processing Pipeline

```
Upload → Validate → Strip EXIF → S3 Store → Redis Queue
              ↓
    Processing Worker (async)
              ↓
    Thumbnail (Sharp/FFmpeg)
              ↓
    Transcription (Whisper mock)
              ↓
    KMP Keyword Detection
              ↓
    Content Moderation
              ↓
    Risk Score (low/medium/high)
              ↓
    Save to PostgreSQL + Elasticsearch
```

## Project Structure

```
irtdp/
├── services/
│   ├── api-gateway/         Central reverse proxy
│   ├── auth-service/        JWT + RBAC
│   ├── incident-service/    Incidents + algorithms
│   ├── media-service/       Upload + S3 + EXIF
│   ├── processing-service/  Async media worker
│   ├── analytics-service/   All 8 DAA algorithms + tests
│   └── notification-service WebSocket push
├── frontend/
│   └── src/pages/           Login, Dashboard, List, Detail, Report, Map
├── scripts/
│   ├── schema.sql           PostgreSQL + PostGIS schema
│   └── seed-data.sql        15 sample Bangalore incidents
├── k8s/deployment.yaml      Full Kubernetes manifests
├── monitoring/              Prometheus + Grafana config
├── .github/workflows/       CI/CD pipeline
└── docker-compose.yml       Full local stack
```
