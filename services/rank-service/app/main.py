from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import RankRequest, RankResponse
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="Rank Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


def score_to_rank(score: float) -> str:
    if score >= 9.0:
        return "Outstanding"
    if score >= 7.0:
        return "Good"
    if score >= 4.0:
        return "Partial"
    return "Poor"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/rank", response_model=RankResponse)
async def rank(payload: RankRequest) -> RankResponse:
    return RankResponse(score=payload.score, rank=score_to_rank(payload.score))
