# PKN VideoDB — Vector Search Exploration

This project explores [sqlite-vector](https://github.com/sqliteai/sqlite-vector) by adapting the PKN VideoDB search interface.

## Live Demo
[https://decaller.github.io/sqlite-vector-video-db/](https://decaller.github.io/sqlite-vector-video-db/)

## Features
- **Vector Search**: Semantic search using `sqlite-vector` (mock embeddings for demo).
- **FTS Search**: Keyword-based search using SQLite's FTS5.
- **WASM Powered**: Entire database and search engine run in the browser.
- **Turso-style UI**: Clean, dark-mode interface for searching ceramah chapters.

## Files
- `index.html`: The main browser-based search interface.
- `pkn.db`: Sample SQLite database with embeddings.
- `seed.mjs`: Script to generate and seed the database.
- `index.mjs`: Simple Node.js test script.

## Development

1.  **Seed the database**:
    ```bash
    node seed.mjs
    ```
2.  **Run locally**:
    Open `index.html` in a local web server (e.g., `npx serve .`).

## License
ISC
