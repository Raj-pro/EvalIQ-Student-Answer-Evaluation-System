from pydantic import BaseModel, Field


class RankRequest(BaseModel):
    score: float = Field(ge=0.0)


class RankResponse(BaseModel):
    score: float
    rank: str
