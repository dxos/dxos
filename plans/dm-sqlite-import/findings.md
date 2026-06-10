# SQLite OPFS browser test coverage audit

> Subgoal B · branch `dm/sqlite-import` · 2026-06-09

## Summary

`@dxos/sql-sqlite` browser tests run via `moon run sql-sqlite:test-browser` (moon tag `ts-test-browser`). CI runs `:test-browser` on affected packages in the **Check** workflow (`.github/workflows/check.yml`).

Before this pass: **1 active**, **3 skipped**, **0** pool-sync coverage.

After this pass: **4 active files**, **5 passing tests**, **2 skipped** (IDB VFS — deferred).

---

## Test inventory

| File                                      | Status     | Covers                                                                                               | Blocker / notes                                   |
| ----------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `sqlite-memory.browser.test.ts`           | ✅ active  | wa-sqlite in-memory CRUD (async WASM)                                                                | Baseline WASM/Vite wiring                         |
| `00-opfs-pool-sync.browser.test.ts`       | ✅ **new** | `writePoolSqlitePayload` → async OPFS read                                                           | Runs after workers shut down (sync handles)       |
| `01-opfs-worker-protocol.browser.test.ts` | ✅ **new** | Worker `import` / `export` messages + SQL                                                            | Raw protocol; explicit worker shutdown            |
| `02-opfs-worker-client.browser.test.ts`   | ✅ active  | Effect `SqliteClient` + OPFS: CRUD, export, import, roundtrip, **persistence across worker restart** |
| `sqlite-idb.browser.test.ts`              | ⏭ skip    | IDBBatchAtomicVFS direct                                                                             | `open_v2` / `vfs.close` fails (`flags` undefined) |
| `sqlite-effect-idb.browser.test.ts`       | ⏭ skip    | Effect client + IDB VFS                                                                              | Same IDB VFS failure                              |

---

## Minimum tests for recovery import confidence

| Scenario                                                       | Test location                             | Status                                     |
| -------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Sync pool write + async read + `/DXOS` header                  | `00-opfs-pool-sync.browser.test.ts`       | ✅                                         |
| Worker import (`deserialize` + VACUUM)                         | `01-opfs-worker-protocol.browser.test.ts` | ✅                                         |
| Worker export (`serialize`)                                    | `01-opfs-worker-protocol.browser.test.ts` | ✅                                         |
| SqliteClient ↔ OpfsWorker CRUD                                 | `02-opfs-worker-client.browser.test.ts`   | ✅                                         |
| SqliteClient export / import / roundtrip                       | `02-opfs-worker-client.browser.test.ts`   | ✅                                         |
| OPFS persistence (kill worker, respawn, read)                  | `02-opfs-worker-client.browser.test.ts`   | ✅                                         |
| SqliteClient export/import via layer (stacked without cleanup) | —                                         | fixed via `runWithOpfsSqliteClient` helper |
| `.dxprofile` CBOR decode → pool write                          | `client-services` node test only          | ⬜ browser gap (subgoal A4)                |
| Large fixture (~124 MB) import                                 | manual / recovery debug port              | ⬜ out of browser unit scope               |

---

## IDB VFS tests — stay deferred

Composer persistence uses **AccessHandlePoolVFS** in a dedicated OPFS worker, not IDBBatchAtomicVFS. IDB tests remain skipped with explicit comments until IDB VFS is needed for a product path.

---

## CI

| Item             | Result                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Package tag      | `ts-test-browser` in `packages/common/sql-sqlite/moon.yml`                                                         |
| CI task          | `moon run :test-browser --affected` in Check workflow                                                              |
| Flake mitigation | Browser project uses `maxWorkers: 1`; storybook-only retry not applied to sql-sqlite (tests stable at 60s timeout) |

---

## New modules

| Module                             | Role                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/opfs-pool-async.ts`           | Async OPFS pool read/list (mirrors recovery `opfs-pool.ts`; safe without second sqlite worker) |
| `src/testing/opfs-test-helpers.ts` | Shared worker lifecycle + `runWithOpfsSqliteClient`                                            |

**Follow-up:** dedupe `composer-app/recovery/opfs-pool.ts` read path to import `@dxos/sql-sqlite/opfs-pool-async` (subgoal A).
