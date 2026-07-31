//
// Copyright 2026 DXOS.org
//

export * from './email-fixtures';
// NOTE: parquet.ts (node:fs-backed `parquetSource`) is intentionally NOT re-exported here — the
// testing entry must stay browser-safe (the Pipeline story imports `loadEnronMessages`). Node tests
// import `./parquet` directly.
