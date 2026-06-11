import initSqlite from '@sqliteai/sqlite-wasm';
import fs from 'fs';

const SRC_DB_PATH = '../../caption-getter/v1/pkn.db';

async function run() {
    const sqlite3 = await initSqlite();
    console.log("sqlite3 initialized");
    
    const srcDb = new sqlite3.oo1.DB(":memory:", "c");
    console.log("DB opened");
    srcDb.close();
    process.exit(0);
}

run().catch(console.error);
