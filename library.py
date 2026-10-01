import json
from pathlib import Path

from book import Book


class Library:
    """Stores the user's saved books in a JSON file so they survive restarts."""

    def __init__(self, path: str = "library.json"):
        self.path = Path(path)
        self.books: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            self.books = json.loads(self.path.read_text(encoding="utf-8"))

    def _save(self) -> None:
        self.path.write_text(
            json.dumps(self.books, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def upsert(self, book: Book) -> Book:
        self.books[book.id] = book.model_dump()
        self._save()
        return book

    def get_all(self) -> list[dict]:
        return list(self.books.values())

    def get_favorites(self) -> list[dict]:
        return [b for b in self.books.values() if b["is_favorite"]]

    def get_read(self) -> list[dict]:
        return [b for b in self.books.values() if b["is_read"]]

    def delete(self, book_id: str) -> bool:
        if book_id in self.books:
            del self.books[book_id]
            self._save()
            return True
        return False
