from pydantic import BaseModel, Field


class StudentAnswerCreate(BaseModel):
    question_id: int
    student_id: str = Field(min_length=1)
    student_answer: str = Field(min_length=1)


class StudentAnswerCreated(BaseModel):
    answer_id: int


class StudentAnswerOut(BaseModel):
    answer_id: int
    question_id: int
    student_id: str
    student_answer: str


class TestInfo(BaseModel):
    test_id: str
    teacher_id: str
    title: str


class QuestionItem(BaseModel):
    question_id: int
    test_id: str
    question_text: str


class TestWithQuestions(BaseModel):
    test: TestInfo
    questions: list[QuestionItem]


class SubmissionAnswerIn(BaseModel):
    question_id: int
    student_answer: str = Field(min_length=1)


class SubmissionCreate(BaseModel):
    test_id: str = Field(min_length=1)
    student_id: str = Field(min_length=1)
    answers: list[SubmissionAnswerIn] = Field(min_length=1)


class SubmissionCreated(BaseModel):
    submission_id: int


class SubmissionOut(BaseModel):
    submission_id: int
    test_id: str
    student_id: str
    answers: list[SubmissionAnswerIn]
