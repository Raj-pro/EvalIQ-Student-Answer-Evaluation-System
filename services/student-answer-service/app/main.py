import os
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import engine, get_session
from .models import Base, StudentAnswer, Submission, SubmissionAnswer
from .schemas import (
    StudentAnswerCreate,
    StudentAnswerCreated,
    StudentAnswerOut,
    SubmissionCreate,
    SubmissionCreated,
    SubmissionOut,
    TestWithQuestions,
)

app = FastAPI(title="Student Answer Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

QUESTION_SERVICE_URL = os.getenv("QUESTION_SERVICE_URL", "http://localhost:8001")
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
    return HTMLResponse(_load_html("student.html"))


@app.get("/tests/{test_id}", response_model=TestWithQuestions)
async def get_test_for_student(test_id: str) -> TestWithQuestions:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{QUESTION_SERVICE_URL}/tests/{test_id}")
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Test not found")
        resp.raise_for_status()
        return TestWithQuestions(**resp.json())


@app.post("/submissions", response_model=SubmissionCreated)
async def create_submission(
    payload: SubmissionCreate, session: AsyncSession = Depends(get_session)
) -> SubmissionCreated:
    sub = Submission(test_id=payload.test_id, student_id=payload.student_id)
    session.add(sub)
    await session.flush()  # get submission_id

    for a in payload.answers:
        session.add(
            SubmissionAnswer(
                submission_id=sub.submission_id,
                question_id=a.question_id,
                student_answer=a.student_answer,
            )
        )

    await session.commit()
    await session.refresh(sub)
    return SubmissionCreated(submission_id=sub.submission_id)


@app.get("/submissions/latest", response_model=SubmissionOut)
async def get_latest_submission(
    test_id: str, student_id: str, session: AsyncSession = Depends(get_session)
) -> SubmissionOut:
    result = await session.execute(
        select(Submission)
        .where(Submission.test_id == test_id)
        .where(Submission.student_id == student_id)
        .order_by(Submission.submission_id.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    ares = await session.execute(
        select(SubmissionAnswer).where(SubmissionAnswer.submission_id == sub.submission_id)
    )
    answers = ares.scalars().all()
    return SubmissionOut(
        submission_id=sub.submission_id,
        test_id=sub.test_id,
        student_id=sub.student_id,
        answers=[
            {"question_id": a.question_id, "student_answer": a.student_answer} for a in answers
        ],
    )


@app.post("/answers", response_model=StudentAnswerCreated)
async def create_answer(
    payload: StudentAnswerCreate, session: AsyncSession = Depends(get_session)
) -> StudentAnswerCreated:
    ans = StudentAnswer(
        question_id=payload.question_id,
        student_id=payload.student_id,
        student_answer=payload.student_answer,
    )
    session.add(ans)
    await session.commit()
    await session.refresh(ans)
    return StudentAnswerCreated(answer_id=ans.answer_id)


@app.get("/answers/{answer_id}", response_model=StudentAnswerOut)
async def get_answer(
    answer_id: int, session: AsyncSession = Depends(get_session)
) -> StudentAnswerOut:
    result = await session.execute(select(StudentAnswer).where(StudentAnswer.answer_id == answer_id))
    ans = result.scalar_one_or_none()
    if not ans:
        raise HTTPException(status_code=404, detail="Answer not found")
    return StudentAnswerOut(
        answer_id=ans.answer_id,
        question_id=ans.question_id,
        student_id=ans.student_id,
        student_answer=ans.student_answer,
    )
