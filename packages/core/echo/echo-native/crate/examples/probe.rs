//! Runs one SQL file against a fresh engine schema on the host, to find SQL that Turso rejects or
//! panics on without killing a wasm instance. Usage: `cargo run --example probe -- <file.sql> [params…]`.

use std::sync::Arc;

use turso_core::{Database, MemoryIO, SqliteDialect};

fn main() {
    let path = std::env::args().nth(1).expect("sql file");
    let sql = std::fs::read_to_string(path).expect("readable sql");
    let io = Arc::new(MemoryIO::new());
    let db = Database::open_file(io, "probe.db", Arc::new(SqliteDialect)).expect("open");
    let conn = db.connect().expect("connect");
    conn.execute(echo_native::SCHEMA_FOR_PROBE).expect("schema");
    match conn.prepare(&sql) {
        Ok(_) => println!("prepared"),
        Err(err) => println!("error: {err}"),
    }
}
