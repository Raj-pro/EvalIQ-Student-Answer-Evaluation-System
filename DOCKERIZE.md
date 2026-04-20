# Dockerizing the Automated Student Answer Evaluation System

This guide provides an overview of how to containerize this project using Docker and Docker Compose.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- Docker Compose v2 (bundled with Docker Desktop)

---

## Step 1 — Dockerfile for each Python service

All five Python services (api-gateway, question-service, student-answer-service, ml-evaluation-service, rank-service) follow the same pattern:

- Base image: `python:3.11-slim`
- Copy and install `requirements.txt`
- Copy the `app/` directory
- Start with `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Create a `Dockerfile` in each `services/<service-name>/` directory.

---

## Step 2 — Dockerfile for the React frontend

Use a **two-stage build**:

1. **Stage 1 (builder):** Use `node:20-alpine`, install dependencies, run `npm run build` to produce the `dist/` folder
2. **Stage 2 (serve):** Use `nginx:alpine`, copy `dist/` into the nginx html directory, and serve it

You also need an `nginx.conf` that routes all unknown paths back to `index.html` (required for React Router SPA navigation).

Create `Dockerfile` and `nginx.conf` inside `services/frontend/`.

---

## Step 3 — docker-compose.yml

Create `docker-compose.yml` at the project root orchestrating these services:

| Service | Build / Image | Port |
|---------|--------------|------|
| postgres | `postgres:15` image | 5432 |
| api-gateway | build from `services/api-gateway` | 8000 |
| question-service | build from `services/question-service` | 8001 |
| student-answer-service | build from `services/student-answer-service` | 8002 |
| ml-evaluation-service | build from `services/ml-evaluation-service` | 8003 |
| rank-service | build from `services/rank-service` | 8004 |
| frontend | build from `services/frontend` | 3001 |
| prometheus | `prom/prometheus` image | 9090 |
| grafana | `grafana/grafana` image | 3000 |

**Key points:**
- Inside Docker Compose, services reference each other by **service name** as hostname (e.g. `http://question-service:8000`), not `localhost`
- Pass `DATABASE_URL` and inter-service URLs as environment variables to each service
- Use a `healthcheck` on postgres so dependent services wait until the database is ready
- Mount named volumes for postgres data, prometheus data, and grafana data

---

## Step 4 — Update the frontend API client

In development, Vite proxies `/q-api`, `/s-api`, `/m-api` to backend services. In the Docker build, there is no dev server — the browser must call the real service URLs directly.

Update `services/frontend/src/api/client.js` so the axios base URLs point to the actual service hosts (e.g. the API Gateway at `http://localhost:8000`) instead of relying on the Vite proxy.

---

## Step 5 — Add .dockerignore files

Add a `.dockerignore` in each service directory to avoid copying unnecessary files into images:

- `__pycache__`, `.venv`, `*.pyc` (Python services)
- `node_modules`, `dist`, `.env` (frontend)

---

## Step 6 — Build and run

```bash
docker compose up --build
```

Open **http://localhost:3001** once all services are healthy.

---

## Useful commands

| Task | Command |
|------|---------|
| Start detached | `docker compose up -d --build` |
| Stop | `docker compose down` |
| Reset database | `docker compose down -v` then `up --build` |
| View logs | `docker compose logs -f <service-name>` |
| Rebuild one service | `docker compose build --no-cache <service-name>` |

---

## Notes

- The `ml-evaluation-service` downloads `all-MiniLM-L6-v2` (~80 MB) on first startup — the initial build takes longer
- For production, replace default Grafana credentials and use Docker secrets or a `.env` file excluded from version control
