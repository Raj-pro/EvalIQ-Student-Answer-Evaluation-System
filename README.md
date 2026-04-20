# Automated Student Answer Evaluation System

A microservices-based platform for creating tests, collecting student answers, and evaluating them automatically using **semantic AI (`sentence-transformers all-MiniLM-L6-v2`)** with a React frontend.

---

## Architecture

```
Browser (React SPA — port 3001)
    │
    ├── Question Service       (port 8001)  — tests & questions
    ├── Student Answer Service (port 8002)  — submissions
    ├── ML Evaluation Service  (port 8003)  — AI scoring
    └── Rank Service           (port 8004)  — score → grade
           │
    API Gateway (port 8000)    — unified proxy
           │
    PostgreSQL (port 5432)     — shared database

Monitoring:
    Prometheus (port 9090) + Grafana (port 3000)
```

Services communicate over REST. Each service exposes Swagger docs at `/docs`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **Database** | PostgreSQL 15, SQLAlchemy 2 (async), asyncpg |
| **AI / ML** | sentence-transformers `all-MiniLM-L6-v2`, scikit-learn |
| **Monitoring** | Prometheus, Grafana |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 20+** and npm
- **PostgreSQL 15** running locally (default port 5432)

---

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE answers;"
```

### 2. Configure environment variables

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

Default values in `.env.example` already point to `localhost` — no changes needed if PostgreSQL uses the default `postgres/postgres` credentials.

> Each backend service reads these variables from the shell environment. You can `export` them or source the file before starting each service.

### 3. Start the backend services

Open **five separate terminals** (one per service). In each terminal, `cd` into the service directory, create a virtual environment, install dependencies, set env vars, and start the server.

#### API Gateway — port 8000

```bash
cd services/api-gateway
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

#### Question Service — port 8001

```bash
cd services/question-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/answers
uvicorn app.main:app --port 8001 --reload
```

#### Student Answer Service — port 8002

```bash
cd services/student-answer-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/answers
export QUESTION_SERVICE_URL=http://localhost:8001
uvicorn app.main:app --port 8002 --reload
```

#### ML Evaluation Service — port 8003

```bash
cd services/ml-evaluation-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/answers
export QUESTION_SERVICE_URL=http://localhost:8001
export STUDENT_ANSWER_SERVICE_URL=http://localhost:8002
export RANK_SERVICE_URL=http://localhost:8004
uvicorn app.main:app --port 8003 --reload
```

> The `all-MiniLM-L6-v2` model (~80 MB) downloads on first startup — this takes a minute.

#### Rank Service — port 8004

```bash
cd services/rank-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8004 --reload
```

### 4. Start the frontend — port 3001

```bash
cd services/frontend
npm install
npm run dev
```

Open **http://localhost:3001**

---

## Service URLs

| Service | URL |
|---------|-----|
| **React App** | http://localhost:3001 |
| API Gateway | http://localhost:8000/docs |
| Question Service | http://localhost:8001/docs |
| Student Answer Service | http://localhost:8002/docs |
| ML Evaluation Service | http://localhost:8003/docs |
| Rank Service | http://localhost:8004/docs |

---

## End-to-End Demo

### 1 — Teacher creates a test

Go to **http://localhost:3001/teacher**

- Fill in **Test ID** (e.g. `math-101`), **Teacher ID**, and **Title**
- Click **Create Test**
- Add questions with their expected answers
- Click **Save Questions**

### 2 — Student submits answers

Go to **http://localhost:3001/student**

- Enter the same **Test ID** and a **Student ID** (e.g. `student-01`)
- Click **Load Test** — questions appear
- Type answers and click **Submit All Answers**

### 3 — View results

Go to **http://localhost:3001/results**

- Enter the **Test ID** and **Student ID**
- Click **Evaluate**
- See the overall score, grade badge, and per-question similarity breakdown

---

## Services

### Question Service — port 8001

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tests` | Create a test |
| GET | `/tests/{test_id}` | Get test with all questions |
| POST | `/tests/{test_id}/questions` | Bulk-add questions |
| GET | `/questions/{question_id}` | Get a single question |

### Student Answer Service — port 8002

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tests/{test_id}` | Load test for student |
| POST | `/submissions` | Submit all answers for a test |
| GET | `/submissions/latest` | Get latest submission by `test_id` + `student_id` |

### ML Evaluation Service — port 8003

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/evaluate-submission` | Evaluate full submission by `test_id` + `student_id` |
| POST | `/evaluate` | Evaluate single answer by `answer_id` |

**Scoring algorithm:**

```
embeddings = all-MiniLM-L6-v2.encode([expected_answer, student_answer])
cosine     = dot(emb1, emb2)                # semantic similarity 0–1
overlap    = Jaccard(word_set_a, word_set_b) # keyword match 0–1

base       = 0.80 × cosine + 0.20 × overlap
score      = 10 × base × (0.6 + 0.4 × length_ratio)   # clamped 0–10
```

### Rank Service — port 8004

| Score | Grade |
|-------|-------|
| ≥ 9.0 | Outstanding |
| ≥ 7.0 | Good |
| ≥ 4.0 | Partial |
| < 4.0 | Poor |

### API Gateway — port 8000

Thin proxy routing requests to individual services. Also exposes unified Swagger docs at `/docs`.

---

## Frontend

```
services/frontend/src/
├── pages/
│   ├── Home.jsx       — landing page with role cards
│   ├── Teacher.jsx    — create test + add questions
│   ├── Student.jsx    — load test, answer, submit
│   └── Results.jsx    — AI evaluation results
├── components/
│   ├── Navbar.jsx     — navigation
│   ├── Layout.jsx     — animated background + shell
│   └── Badge.jsx      — grade badge
└── api/
    └── client.js      — axios instances per service
```

Vite proxies `/q-api`, `/s-api`, `/m-api` to the backend services during development.

---

## Project Structure

```
├── .env.example
├── README.md
├── DOCKERIZE.md          ← guide to containerize this project
└── services/
    ├── frontend/                  ← React + Vite + Tailwind SPA
    ├── api-gateway/               ← FastAPI proxy (port 8000)
    ├── question-service/          ← FastAPI (port 8001)
    ├── student-answer-service/    ← FastAPI (port 8002)
    ├── ml-evaluation-service/     ← FastAPI + sentence-transformers (port 8003)
    ├── rank-service/              ← FastAPI stateless (port 8004)
    └── monitoring/
        ├── prometheus/
        └── grafana/
```

---

## Troubleshooting

**PostgreSQL connection refused**
Make sure PostgreSQL is running and the `answers` database exists:
```bash
psql -U postgres -c "CREATE DATABASE answers;"
```

**ML service slow on first request**
The `all-MiniLM-L6-v2` model loads on startup (~2–3 seconds). Subsequent requests are fast. On the very first run it also downloads the model weights (~80 MB).

**Port already in use**
Find and kill the process using the port:
```bash
lsof -ti :8001 | xargs kill   # replace 8001 with the conflicting port
```

**Old schema / missing columns**
Drop and recreate the database to apply the latest schema:
```bash
psql -U postgres -c "DROP DATABASE answers;"
psql -U postgres -c "CREATE DATABASE answers;"
```
Then restart all services — they recreate tables on startup.

**Want to containerize this project?**
See [DOCKERIZE.md](DOCKERIZE.md) for a complete Docker + Docker Compose guide.
