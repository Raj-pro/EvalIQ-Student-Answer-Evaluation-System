from pydantic import BaseModel, Field


class EvaluateRequest(BaseModel):
    answer_id: int


class EvaluateResponse(BaseModel):
    evaluation_id: int
    answer_id: int
    score: float = Field(ge=0.0)
    rank: str
    similarity: float = Field(ge=0.0)


class EvaluateSubmissionRequest(BaseModel):
    test_id: str = Field(min_length=1)
    student_id: str = Field(min_length=1)


class SubmissionQuestionResult(BaseModel):
    question_id: int
    score: float = Field(ge=0.0)
    similarity: float = Field(ge=0.0)


class EvaluateSubmissionResponse(BaseModel):
    evaluation_id: int
    submission_id: int
    test_id: str
    student_id: str
    total_score: float = Field(ge=0.0)
    rank: str
    results: list[SubmissionQuestionResult]
