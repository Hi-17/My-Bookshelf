import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from book import Book
from library import Library

app = FastAPI(title="My Bookshelf API")
library = Library()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Book API running"}


@app.get("/search-books")
def search_books(q: str, limit: int = 24):
    try:
        res = requests.get(
            "https://openlibrary.org/search.json",
            params={
                "q": q,
                "limit": limit,
                "fields": "key,title,author_name,cover_i,subject",
            },
            timeout=10,
        )
        res.raise_for_status()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Could not reach Open Library")

    results = []
    for item in res.json().get("docs", []):
        if "key" not in item:
            continue
        authors = item.get("author_name") or ["Unknown"]
        subjects = item.get("subject") or []
        cover_id = item.get("cover_i")
        results.append({
            "id": item["key"],
            "title": item.get("title", "Untitled"),
            "author": authors[0],
            "genre": subjects[0] if subjects else None,
            "cover": (
                f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                if cover_id else None
            ),
        })
    return results


@app.get("/books")
def get_books():
    return library.get_all()


@app.get("/books/favorites")
def get_favorites():
    return library.get_favorites()


@app.get("/books/read")
def get_read():
    return library.get_read()


@app.put("/books")
def save_book(book: Book):
    """Create or update a saved book (favorite, read, rating, notes)."""
    return library.upsert(book)


@app.delete("/books")
def delete_book(book_id: str):
    if not library.delete(book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "Deleted"}
