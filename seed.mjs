import initSqlite from '@sqliteai/sqlite-wasm';
import fs from 'fs';

// Simple "embedding" generator for demo purposes
// In a real app, you'd use OpenAI, Transformers.js, etc.
function mockEmbedding(text) {
    const vec = new Float32Array(3);
    const lower = text.toLowerCase();
    // Very simple heuristic: count certain letters to differentiate vectors
    vec[0] = (lower.match(/a/g) || []).length / 10;
    vec[1] = (lower.match(/e/g) || []).length / 10;
    vec[2] = (lower.match(/i/g) || []).length / 10;
    return JSON.stringify(Array.from(vec));
}

async function seed() {
    const sqlite3 = await initSqlite();
    const db = new sqlite3.oo1.DB('pkn.db', 'c');

    try {
        console.log("Creating schema...");
        db.exec(`
            CREATE TABLE videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE
            );
            CREATE TABLE chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL REFERENCES videos(id),
                start_time TEXT NOT NULL,
                start_seconds INTEGER NOT NULL,
                topic TEXT NOT NULL,
                summary TEXT,
                embedding BLOB
            );
            CREATE VIRTUAL TABLE chapters_fts USING fts5(
                topic,
                summary,
                content=chapters,
                content_rowid=id
            );
        `);

        // Initialize vector extension
        db.exec("SELECT vector_init('chapters', 'embedding', 'dimension=3,distance=l2')");

        console.log("Inserting data...");
        const videos = [
            { id: 1, title: "Parenting 101", url: "https://youtube.com/watch?v=123" },
            { id: 2, title: "Disiplin Anak", url: "https://youtube.com/watch?v=456" }
        ];

        for (const v of videos) {
            db.exec({
                sql: "INSERT INTO videos(id, title, url) VALUES(?, ?, ?)",
                bind: [v.id, v.title, v.url]
            });
        }

        const chapters = [
            { video_id: 1, start_time: "00:01", start_seconds: 1, topic: "Tangki Cinta", summary: "Menjelaskan tentang kebutuhan kasih sayang anak." },
            { video_id: 1, start_time: "05:00", start_seconds: 300, topic: "Bakat Anak", summary: "Cara mengenali potensi terpendam anak." },
            { video_id: 2, start_time: "02:30", start_seconds: 150, topic: "Disiplin Positif", summary: "Metode mendisiplinkan tanpa kekerasan." },
            { video_id: 2, start_time: "10:15", start_seconds: 615, topic: "Komunikasi Efektif", summary: "Berbicara agar anak mau mendengarkan." }
        ];

        for (const c of chapters) {
            const vecJson = mockEmbedding(c.topic + " " + c.summary);
            db.exec({
                sql: "INSERT INTO chapters(video_id, start_time, start_seconds, topic, summary, embedding) VALUES(?, ?, ?, ?, ?, vector_as_f32(?))",
                bind: [c.video_id, c.start_time, c.start_seconds, c.topic, c.summary, vecJson]
            });
            // Update FTS
            db.exec({
                sql: "INSERT INTO chapters_fts(rowid, topic, summary) VALUES(last_insert_rowid(), ?, ?)",
                bind: [c.topic, c.summary]
            });
        }

        console.log("Database seeded successfully.");

        // Export to file system (WASM FS to Node FS)
        const dbExport = sqlite3.capi.sqlite3_js_db_export(db.pointer);
        fs.writeFileSync('pkn.db', dbExport);
        console.log("pkn.db written to disk.");

    } catch (err) {
        console.error(err);
    } finally {
        db.close();
    }
}

seed();
