import initSqlite from '@sqliteai/sqlite-wasm';
import { pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';
import fs from 'fs';

const SRC_DB_PATH = '../../caption-getter/v1/pkn.db';
const DEST_DB_PATH = './pkn.db';
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

async function run() {
    console.log(`Loading model: ${MODEL_NAME}...`);
    const extractor = await pipeline('feature-extraction', MODEL_NAME);

    // 1. Read source data with better-sqlite3
    console.log(`Reading source database from ${SRC_DB_PATH}...`);
    if (!fs.existsSync(SRC_DB_PATH)) {
        console.error("Source database not found!");
        process.exit(1);
    }
    
    const srcDb = new Database(SRC_DB_PATH);
    const videos = srcDb.prepare("SELECT id, title, url FROM videos").all();
    const chapters = srcDb.prepare("SELECT id, video_id, start_time, start_seconds, topic, summary FROM chapters").all();
    srcDb.close();

    console.log(`Found ${videos.length} videos and ${chapters.length} chapters.`);

    // 2. Initialize WASM DB for destination
    const sqlite3 = await initSqlite();
    const destDb = new sqlite3.oo1.DB(":memory:", "c");
    destDb.exec(`
        CREATE TABLE videos (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE
        );
        CREATE TABLE chapters (
            id INTEGER PRIMARY KEY,
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
    destDb.exec("SELECT vector_init('chapters', 'embedding', 'dimension=384,distance=l2')");

    console.log("Inserting videos...");
    for (const v of videos) {
        destDb.exec({
            sql: "INSERT INTO videos(id, title, url) VALUES(?, ?, ?)",
            bind: [v.id, v.title, v.url]
        });
    }

    console.log(`Generating embeddings and inserting chapters (this may take a minute)...`);
    let count = 0;
    for (const c of chapters) {
        const text = `${c.topic} ${c.summary || ''}`.trim();
        
        // Generate real embedding
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);
        const vecJson = JSON.stringify(vector);

        destDb.exec({
            sql: "INSERT INTO chapters(id, video_id, start_time, start_seconds, topic, summary, embedding) VALUES(?, ?, ?, ?, ?, ?, vector_as_f32(?))",
            bind: [c.id, c.video_id, c.start_time, c.start_seconds, c.topic, c.summary, vecJson]
        });

        // Update FTS
        destDb.exec({
            sql: "INSERT INTO chapters_fts(rowid, topic, summary) VALUES(?, ?, ?)",
            bind: [c.id, c.topic, c.summary]
        });

        count++;
        if (count % 100 === 0) console.log(`  Processed ${count}/${chapters.length}...`);
    }

    console.log("Database seeded successfully.");

    // Export to file system
    const dbExport = sqlite3.capi.sqlite3_js_db_export(destDb.pointer);
    fs.writeFileSync(DEST_DB_PATH, dbExport);
    destDb.close();
    
    console.log(`Final database written to ${DEST_DB_PATH} (${(dbExport.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    process.exit(0);
}

run().catch(console.error);
