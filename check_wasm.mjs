import initSqlite from '@sqliteai/sqlite-wasm';

async function check() {
  const sqlite3 = await initSqlite();
  console.log("wasm keys:", Object.keys(sqlite3.wasm));
  console.log("heap8u type:", typeof sqlite3.wasm.heap8u);
  process.exit(0);
}

check();
