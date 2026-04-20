import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from prometheus_fastapi_instrumentator import Instrumentator


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


QUESTION_SERVICE_URL = _env("QUESTION_SERVICE_URL", "http://localhost:8001")
STUDENT_ANSWER_SERVICE_URL = _env("STUDENT_ANSWER_SERVICE_URL", "http://localhost:8002")
ML_EVALUATION_SERVICE_URL = _env("ML_EVALUATION_SERVICE_URL", "http://localhost:8003")
RANK_SERVICE_URL = _env("RANK_SERVICE_URL", "http://localhost:8004")

app = FastAPI(title="API Gateway")

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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ui", response_class=HTMLResponse, include_in_schema=False)
async def ui() -> HTMLResponse:
    return HTMLResponse(_load_html("ui.html"))


@app.get("/results", response_class=HTMLResponse, include_in_schema=False)
async def results_ui() -> HTMLResponse:
    return HTMLResponse(_load_html("results.html"))


async def _proxy(request: Request, upstream_base: str, upstream_path: str) -> Response:
    url = f"{upstream_base}{upstream_path}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            upstream = await client.request(
                request.method,
                url,
                params=request.query_params,
                content=await request.body(),
                headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e!s}")

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


# Question Service
@app.api_route("/questions", methods=["POST"])  # create question
async def proxy_create_question(request: Request) -> Response:
    return await _proxy(request, QUESTION_SERVICE_URL, "/questions")


@app.api_route("/questions/{question_id}", methods=["GET"])  # get question
async def proxy_get_question(request: Request, question_id: int) -> Response:
    return await _proxy(request, QUESTION_SERVICE_URL, f"/questions/{question_id}")


# Student Answer Service
@app.api_route("/answers", methods=["POST"])  # create answer
async def proxy_create_answer(request: Request) -> Response:
    return await _proxy(request, STUDENT_ANSWER_SERVICE_URL, "/answers")


@app.api_route("/answers/{answer_id}", methods=["GET"])  # get answer
async def proxy_get_answer(request: Request, answer_id: int) -> Response:
    return await _proxy(request, STUDENT_ANSWER_SERVICE_URL, f"/answers/{answer_id}")


# Rank Service
@app.api_route("/rank", methods=["POST"])  # score -> grade
async def proxy_rank(request: Request) -> Response:
    return await _proxy(request, RANK_SERVICE_URL, "/rank")


# ML Evaluation Service
@app.api_route("/evaluate", methods=["POST"])  # evaluate answer
async def proxy_evaluate(request: Request) -> Response:
    return await _proxy(request, ML_EVALUATION_SERVICE_URL, "/evaluate")
