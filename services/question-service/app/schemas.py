from pydantic import BaseModel, Field


class TestCreate(BaseModel):
    test_id: str = Field(min_length=1)
    teacher_id: str = Field(min_length=1)
    title: str = Field(min_length=1)


class TestOut(BaseModel):
    test_id: str
    teacher_id: str
    title: str


class QuestionCreate(BaseModel):
    test_id: str = Field(min_length=1)
    question_text: str = Field(min_length=1)
    expected_answer: str = Field(min_length=1)


class QuestionBulkItem(BaseModel):
    question_text: str = Field(min_length=1)
    expected_answer: str = Field(min_length=1)


class QuestionsBulkCreate(BaseModel):
    questions: list[QuestionBulkItem] = Field(min_length=1)


class QuestionOut(BaseModel):
    question_id: int
    test_id: str
    question_text: str
    expected_answer: str


class QuestionCreated(BaseModel):
    question_id: int


class QuestionsBulkCreated(BaseModel):
    question_ids: list[int]


class TestQuestionsOut(BaseModel):
    test: TestOut
    questions: list[QuestionOut]
