from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .db import engine, get_session
from .models import Base, Question, Test
from .schemas import (
    QuestionCreate,
    QuestionCreated,
    QuestionsBulkCreate,
    QuestionsBulkCreated,
    QuestionOut,
    TestCreate,
    TestOut,
    TestQuestionsOut,
)

app = FastAPI(title="Question Service")

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

        # Lightweight migration for dev/demo environments:
        # - older runs created `questions` without `test_id`
        # - add the column and backfill with a legacy value
        await conn.execute(
            text(
                """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'tests'
    ) THEN
        CREATE TABLE tests (
            test_id text PRIMARY KEY,
            teacher_id text NOT NULL,
            title text NOT NULL,
            created_at timestamp NOT NULL DEFAULT (now())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'test_id'
    ) THEN
        ALTER TABLE questions ADD COLUMN test_id text;
        UPDATE questions SET test_id = 'legacy' WHERE test_id IS NULL;
        ALTER TABLE questions ALTER COLUMN test_id SET NOT NULL;
    END IF;
END $$;
"""
        )
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ui", response_class=HTMLResponse, include_in_schema=False)
async def ui() -> HTMLResponse:
    return HTMLResponse(_load_html("teacher.html"))


@app.post("/tests", response_model=TestOut)
async def create_test(payload: TestCreate, session: AsyncSession = Depends(get_session)) -> TestOut:
    existing = await session.get(Test, payload.test_id)
    if existing:
        raise HTTPException(status_code=409, detail="Test ID already exists")

    t = Test(test_id=payload.test_id, teacher_id=payload.teacher_id, title=payload.title)
    session.add(t)
    await session.commit()
    return TestOut(test_id=t.test_id, teacher_id=t.teacher_id, title=t.title)


@app.get("/tests/{test_id}", response_model=TestQuestionsOut)
async def get_test(test_id: str, session: AsyncSession = Depends(get_session)) -> TestQuestionsOut:
    t = await session.get(Test, test_id)
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")

    result = await session.execute(select(Question).where(Question.test_id == test_id))
    questions = result.scalars().all()

    return TestQuestionsOut(
        test=TestOut(test_id=t.test_id, teacher_id=t.teacher_id, title=t.title),
        questions=[
            QuestionOut(
                question_id=q.question_id,
                test_id=q.test_id,
                question_text=q.question_text,
                expected_answer=q.expected_answer,
            )
            for q in questions
        ],
    )


@app.post("/questions", response_model=QuestionCreated)
async def create_question(
    payload: QuestionCreate, session: AsyncSession = Depends(get_session)
) -> QuestionCreated:
    t = await session.get(Test, payload.test_id)
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")

    q = Question(
        test_id=payload.test_id,
        question_text=payload.question_text,
        expected_answer=payload.expected_answer,
    )
    session.add(q)
    await session.commit()
    await session.refresh(q)
    return QuestionCreated(question_id=q.question_id)


@app.post("/tests/{test_id}/questions", response_model=QuestionsBulkCreated)
async def create_questions_bulk(
    test_id: str,
    payload: QuestionsBulkCreate,
    session: AsyncSession = Depends(get_session),
) -> QuestionsBulkCreated:
    t = await session.get(Test, test_id)
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")

    created_ids: list[int] = []
    for item in payload.questions:
        q = Question(test_id=test_id, question_text=item.question_text, expected_answer=item.expected_answer)
        session.add(q)
        await session.flush()
        created_ids.append(q.question_id)

    await session.commit()
    return QuestionsBulkCreated(question_ids=created_ids)


@app.get("/questions/{question_id}", response_model=QuestionOut)
async def get_question(
    question_id: int, session: AsyncSession = Depends(get_session)
) -> QuestionOut:
    result = await session.execute(select(Question).where(Question.question_id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionOut(
        question_id=q.question_id,
        test_id=q.test_id,
        question_text=q.question_text,
        expected_answer=q.expected_answer,
    )
