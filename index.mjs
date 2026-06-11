import initSqlite from '@sqliteai/sqlite-wasm';

async function test() {
  const sqlite3 = await initSqlite();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  
  try {
    const version = db.exec("SELECT vector_version()", { returnValue: "resultRows" });
    console.log("sqlite-vector version:", version[0][0]);
    
    // 1. Create a table
    db.exec("CREATE TABLE items(id INTEGER PRIMARY KEY, content TEXT, embedding BLOB)");
    
    // 2. Initialize vector extension for the column
    // Dimension 3, distance=L2
    db.exec("SELECT vector_init('items', 'embedding', 'dimension=3,distance=l2')");
    
    // 3. Insert some data
    const items = [
      { content: "Apple", vector: "[1.0, 1.0, 0.0]" },
      { content: "Banana", vector: "[1.1, 0.9, 0.1]" },
      { content: "Space Rocket", vector: "[0.0, 0.0, 10.0]" }
    ];
    
    for (const item of items) {
      db.exec({
        sql: "INSERT INTO items(content, embedding) VALUES(?, vector_as_f32(?))",
        bind: [item.content, item.vector]
      });
    }
    
    console.log("Data inserted.");
    
    // 4. Search
    const queryVector = "[1.0, 0.9, 0.0]";
    console.log(`Searching for neighbors of ${queryVector}...`);
    
    const results = db.exec({
      sql: `
        SELECT i.content, v.distance 
        FROM items i
        JOIN vector_full_scan('items', 'embedding', vector_as_f32(?)) v ON i.id = v.rowid
        ORDER BY v.distance ASC
        LIMIT 5
      `,
      bind: [queryVector],
      returnValue: "resultRows"
    });
    
    console.log("Search Results:");
    results.forEach(([content, distance]) => {
      console.log(`- ${content} (distance: ${distance.toFixed(4)})`);
    });
    
  } catch (err) {
    console.error("Error:", err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    db.close();
  }
}

test();
