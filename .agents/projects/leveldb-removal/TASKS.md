# LevelDB / `@dxos/kv-store` removal — Tasks

_Resume: PR #12492 OPEN. Merged main + addressed CodeRabbit review; watching CI. Last: all phases done, builds + tests + lint green._

Full context and rationale in `DESIGN.md`. Branch `claude/leveldb-kv-store-audit-qa3zl2`.

## Phase 1: echo-host automerge

- [x] **Relocate `StorageAdapterDataMonitor`** → `sqlite-storage-adapter.ts`; `echo-data-monitor.ts` imports from there.
- [x] **Delete `leveldb-storage-adapter.ts`** + remove its `automerge/index.ts` export.
- [x] **Delete `heads-store.ts`**.
- [x] **Convert `subduction-test-utils.ts`** `createLevelAdapter` → `createSqliteAdapter` (via shared helper).
- [x] **Convert `automerge-repo.test.ts`** — in-memory + file-based SQLite persistence cases.
- [x] **Delete `storage-adapter.test.ts`** (redundant).
- [x] **Drop `@dxos/kv-store` + `level-transcoder`** from echo-host `package.json`.
- [x] **Added `createTestSqliteStorageAdapter`** shared helper in `testing/sqlite-test-runtime.ts`.
- [x] **Build + test** echo-host — 265 pass / 1 todo.

## Phase 2: client-services + client + plugin-client

- [x] **Delete `storage/level.ts`**; update `storage/index.ts`.
- [x] **Edit `profile-archive.ts`** — drop `level` param + `KEY_VALUE` write; keep CBOR + `FILE`/`SQLITE_DATABASE`.
- [x] **Drop `@dxos/kv-store`** from client-services `package.json`.
- [x] **`client.ts` `repair()`** — removed Level cleanup block.
- [x] **`devtools.ts`** — dropped `createLevel` from export/import hooks.
- [x] **`plugin-client` `profile/import.ts`** — dropped `createLevel`.
- [x] **Build + test** — client-services 154 pass; client/plugin-client build.

## Phase 3: blade-runner

- [x] **Replaced `leveldb` adapter kind with `sqlite`** in `storage-replicant.ts` + `automerge-replicant.ts` (via `createTestSqliteStorageAdapter`).
- [x] **`echo-replicant.ts`** — `EchoTestPeer({ storagePath })` (the stale `kv` option no longer exists).
- [x] **`spec/storage.ts`** default → `sqlite`.
- [x] **Drop `@dxos/kv-store`**; build.

## Phase 4: package + catalog removal

- [x] **Deleted `packages/common/kv-store`**.
- [x] **Removed `@dxos/kv-store`** from compute-runtime, echo-client, sdk/client, composer-app; app-framework `DEFAULT_PACKAGES`; `.changeset/config.json` + all tsconfig references (toolbox-synced).
- [x] **Removed `level`/`abstract-level`/`level-transcoder`** catalog entries; `classic-level` built-dep.
- [x] **`pnpm install`** — lockfile refreshed (−9 packages).
- [x] **Added changeset** (`@dxos/echo` minor, `@dxos/plugin-markdown` patch).

## Phase 5: verify + PR

- [x] **Grep** — zero residual references across runtime/package/catalog/lockfile **source** (project docs, release notes, and the retained `ProfileArchiveEntryType.KEY_VALUE = 2` enum + its doc comment are intentional exceptions; check.yml example updated to better-sqlite3).
- [x] **Build affected** — echo-host, client-services, client, plugin-client, blade-runner, echo-client, compute-runtime, app-framework (184 build tasks pass).
- [x] **Format + lint** — `pnpm format`; lint green on all changed packages.
- [x] **Commit, push, open PR** — PR #12492.
- [x] **Merge main + review** — resolved `sqlite-storage-adapter.ts` migrator conflict (main added a `Migrator`-based `migrate`; kept it + inline `StorageAdapterDataMonitor`); fixed `echo-replicant` SQLite runtime leak (`disposeStorage()` after `close()`), removed pre-existing `!` in devtools profile lookups.

### Notes

- Env: fresh container needed `pnpm install` + Node 24 (proto `/root/.proto/tools/node/24.11.1`); `better-sqlite3` rebuilt for ABI 137 via `prebuild-install --runtime node --target 24.11.1`.
