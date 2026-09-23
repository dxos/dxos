---
'@dxos/sql-sqlite': patch
---

A column that fails to decode while reading a SQLite row now raises `SQLITE_DECODE_ERROR`, naming the
column, its index, its SQLite storage type, its byte length and the statement, instead of surfacing the
bare `RangeError: Bad value` the wasm/`TextDecoder` boundary produces. The stored bytes are never
included, and the original error is kept as the cause.
