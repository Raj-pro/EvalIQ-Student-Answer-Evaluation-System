import os
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy.ext.asyncio import AsyncSession

from .db import engine, get_session
from .ml import predict_score, similarity_features
from .models import Base, EvaluationResult, SubmissionEvaluation, SubmissionEvaluationItem
from .schemas import (
    EvaluateRequest,
    EvaluateResponse,
    EvaluateSubmissionRequest,
    EvaluateSubmissionResponse,
    SubmissionQuestionResult,
)


def _env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


QUESTION_SERVICE_URL = _env("QUESTION_SERVICE_URL")
STUDENT_ANSWER_SERVICE_URL = _env("STUDENT_ANSWER_SERVICE_URL")
RANK_SERVICE_URL = _env("RANK_SERVICE_URL")

app = FastAPI(title="ML Evaluation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

_UI_DIR = Path(__file__).parent / "ui"


def _load_html(name: str) -> str:
    return (_UI_DIR / name).read_text(encoding="utf-8")


@app.on_event("startup")
async def startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ui", response_class=HTMLResponse, include_in_schema=False)
async def ui() -> HTMLResponse:
    return HTMLResponse(_load_html("results.html"))


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    payload: EvaluateRequest, session: AsyncSession = Depends(get_session)
) -> EvaluateResponse:
    answer_id = payload.answer_id

    async with httpx.AsyncClient(timeout=15.0) as client:
        ans_resp = await client.get(f"{STUDENT_ANSWER_SERVICE_URL}/answers/{answer_id}")
        if ans_resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Answer not found")
        ans_resp.raise_for_status()
        ans = ans_resp.json()

        qid = ans.get("question_id")
        q_resp = await client.get(f"{QUESTION_SERVICE_URL}/questions/{qid}")
        if q_resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Question not found")
        q_resp.raise_for_status()
        q = q_resp.json()

        expected = q.get("expected_answer", "")
        student = ans.get("student_answer", "")

        feats = similarity_features(expected, student)
        score = predict_score(feats)
        similarity = float(feats["cosine_similarity"])

        rank_resp = await client.post(f"{RANK_SERVICE_URL}/rank", json={"score": score})
        rank_resp.raise_for_status()
        rank = rank_resp.json().get("rank", "Unknown")

    ev = EvaluationResult(answer_id=answer_id, score=score, rank=rank, similarity=similarity)
    session.add(ev)
    await session.commit()
    await session.refresh(ev)

    return EvaluateResponse(
        evaluation_id=ev.evaluation_id,
        answer_id=ev.answer_id,
        score=ev.score,
        rank=ev.rank,
        similarity=ev.similarity,
    )


@app.post("/evaluate-submission", response_model=EvaluateSubmissionResponse)
async def evaluate_submission(
    payload: EvaluateSubmissionRequest, session: AsyncSession = Depends(get_session)
) -> EvaluateSubmissionResponse:
    async with httpx.AsyncClient(timeout=20.0) as client:
        sub_resp = await client.get(
            f"{STUDENT_ANSWER_SERVICE_URL}/submissions/latest",
            params={"test_id": payload.test_id, "student_id": payload.student_id},
        )
        if sub_resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Submission not found")
        sub_resp.raise_for_status()
        sub = sub_resp.json()

        submission_id = int(sub["submission_id"])
        answers = sub.get("answers", [])
        if not answers:
            raise HTTPException(status_code=400, detail="Submission has no answers")

        results: list[SubmissionQuestionResult] = []
        total = 0.0

        for a in answers:
            qid = int(a["question_id"])
            student_answer = a["student_answer"]

            q_resp = await client.get(f"{QUESTION_SERVICE_URL}/questions/{qid}")
            q_resp.raise_for_status()
            expected = q_resp.json().get("expected_answer", "")

            feats = similarity_features(expected, student_answer)
            score = predict_score(feats)
            similarity = float(feats["cosine_similarity"])
            total += score
            results.append(
                SubmissionQuestionResult(question_id=qid, score=score, similarity=similarity)
            )

        total_score = total / max(1, len(results))

        rank_resp = await client.post(f"{RANK_SERVICE_URL}/rank", json={"score": total_score})
        rank_resp.raise_for_status()
        rank = rank_resp.json().get("rank", "Unknown")

    ev = SubmissionEvaluation(
        submission_id=submission_id,
        test_id=payload.test_id,
        student_id=payload.student_id,
        total_score=total_score,
        rank=rank,
    )
    session.add(ev)
    await session.flush()

    for r in results:
        session.add(
            SubmissionEvaluationItem(
                evaluation_id=ev.evaluation_id,
                question_id=r.question_id,
                score=r.score,
                similarity=r.similarity,
            )
        )

    await session.commit()
    await session.refresh(ev)

    return EvaluateSubmissionResponse(
        evaluation_id=ev.evaluation_id,
        submission_id=submission_id,
        test_id=payload.test_id,
        student_id=payload.student_id,
        total_score=ev.total_score,
        rank=ev.rank,
        results=results,
    )
