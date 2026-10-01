from pydantic import BaseModel, Field


class Book(BaseModel):
    id: str                        
    title: str
    author: str = "Unknown"
    cover: str | None = None
    genre: str | None = None
    is_favorite: bool = False
    is_read: bool = False
    rating: int | None = Field(default=None, ge=1, le=5)
    summary: str = ""
