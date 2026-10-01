const API = "http://127.0.0.1:8000";
const PLACEHOLDER =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>" +
    "<rect width='100%' height='100%' fill='%23f8c8dc'/>" +
    "<text x='50%' y='50%' text-anchor='middle' fill='%235a1a3a' font-size='18'>No cover</text></svg>";

const QUERIES = {
    bestseller: "subject:bestsellers",
    fantasy: "subject:fantasy",
    romance: "subject:romance",
};

const grid = document.getElementById("grid");
const detailPage = document.getElementById("detailPage");
const detailContent = document.getElementById("detailContent");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("searchInput");

let saved = {};            // id: book saved in the backend
let searchResults = [];    // books from the latest search
let getView = () => [];    // returns the books for the current view



function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = isError ? "error" : "";
}

async function api(path, options) {
    const res = await fetch(API + path, options);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
}

function withState(book) {
    return saved[book.id] || {
        ...book, is_favorite: false, is_read: false, rating: null, summary: "",
    };
}

async function persist(book) {
    try {
        const isEmpty = !book.is_favorite && !book.is_read && !book.rating && !book.summary;
        if (isEmpty) {
            if (saved[book.id]) {
                await api("/books?book_id=" + encodeURIComponent(book.id), { method: "DELETE" });
                delete saved[book.id];
            }
        } else {
            await api("/books", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(book),
            });
            saved[book.id] = book;
        }
    } catch (err) {
        setStatus("Could not save. Is the backend running?", true);
    }
}



function setActive(name) {
    document.querySelectorAll("#menu button").forEach(b =>
        b.classList.toggle("active", b.dataset.view === name));
}

function render() {
    detailPage.hidden = true;
    grid.hidden = false;
    grid.replaceChildren();

    const books = getView();
    if (books.length === 0) {
        setStatus("Nothing here yet.");
        return;
    }

    books.forEach(raw => {
        const book = withState(raw);
        const card = el("div", "card");

        const img = el("img");
        img.src = book.cover || PLACEHOLDER;
        img.alt = book.title;
        img.addEventListener("click", () => openBook(raw));

        const star = el("button", "star", book.is_favorite ? "⭐" : "☆");
        star.title = "Favorite";
        star.addEventListener("click", () => toggle(raw, "is_favorite"));

        const plus = el("button", "plus", book.is_read ? "✔" : "➕");
        plus.title = "Mark as read";
        plus.addEventListener("click", () => toggle(raw, "is_read"));

        card.append(img, star, plus, el("p", "", book.title));
        grid.appendChild(card);
    });
}

async function toggle(raw, field) {
    const book = { ...withState(raw) };
    book[field] = !book[field];
    await persist(book);
    render();
}

async function loadSearch(query, name) {
    setActive(name);
    setStatus("Loading…");
    grid.replaceChildren();
    try {
        searchResults = await api("/search-books?q=" + encodeURIComponent(query));
        getView = () => searchResults;
        setStatus(searchResults.length ? "" : "No books found.");
        render();
    } catch (err) {
        setStatus("Could not load books. Is the backend running on port 8000?", true);
    }
}

function showSaved(name, filterFn) {
    setActive(name);
    setStatus("");
    getView = () => Object.values(saved).filter(filterFn);
    render();
    if (getView().length === 0) {
        setStatus(name === "favorites" ? "No favorites yet. Tap ☆ on a book." : "No books marked as read yet.");
    }
}



function openBook(raw) {
    const book = { ...withState(raw) };
    grid.hidden = true;
    detailPage.hidden = false;
    detailContent.replaceChildren();

    const img = el("img");
    img.src = book.cover || PLACEHOLDER;
    img.alt = book.title;

    const rating = el("div", "rating");
    const drawStars = () => {
        rating.replaceChildren();
        for (let i = 1; i <= 5; i++) {
            const s = el("button", "", i <= (book.rating || 0) ? "★" : "☆");
            s.title = i + " / 5";
            s.addEventListener("click", async () => {
                book.rating = book.rating === i ? null : i;
                await persist(book);
                drawStars();
            });
            rating.appendChild(s);
        }
    };
    drawStars();

    const notes = el("textarea");
    notes.placeholder = "My notes";
    notes.value = book.summary;
    notes.addEventListener("blur", async () => {
        book.summary = notes.value.trim();
        await persist(book);
    });

    detailContent.append(
        img,
        el("h2", "", book.title),
        el("p", "", "Author: " + book.author),
        el("p", "", "Genre: " + (book.genre || "Unknown")),
        rating,
        notes,
    );
}



document.getElementById("menu").addEventListener("click", e => {
    const name = e.target.dataset.view;
    if (!name) return;
    if (QUERIES[name]) loadSearch(QUERIES[name], name);
    if (name === "favorites") showSaved(name, b => b.is_favorite);
    if (name === "read") showSaved(name, b => b.is_read);
});

function runSearch() {
    const q = searchInput.value.trim();
    if (q) loadSearch(q, null);
}
document.getElementById("searchBtn").addEventListener("click", runSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") runSearch(); });
document.getElementById("backBtn").addEventListener("click", render);



(async function init() {
    try {
        (await api("/books")).forEach(b => { saved[b.id] = b; });
    } catch (err) {
        setStatus("Could not reach the backend. Start it with: uvicorn main:app --reload", true);
        return;
    }
    loadSearch(QUERIES.bestseller, "bestseller");
})();
