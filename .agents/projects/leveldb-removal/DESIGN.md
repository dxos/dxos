# LevelDB / `@dxos/kv-store` removal — DESIGN

_Resume: see TASKS.md. Branch: `claude/leveldb-kv-store-audit-qa3zl2`._

## Goal

Fully remove LevelDB from the monorepo: delete the `@dxos/kv-store` package,
the `level` / `abstract-level` / `level-transcoder` / `classic-level`
dependencies, and every code path that opens a Level database. Everything that
touched LevelDB is already superseded by SQLite (`@dxos/sql-sqlite` +
`@effect/sql-sqlite-node`) — convert remaining consumers to that.

## Why this is safe (audit findings, 2026-08-06)

LevelDB is already dead as a live store; only legacy/tooling paths remain.

- **Automerge document storage** → `SqliteStorageAdapter` is the default
  (`automerge-host.ts:233`). `LevelDBStorageAdapter` is instantiated only by
  tests and blade-runner benchmarks.
- **Heads store** → `SqliteHeadsStore` is the default (`automerge-host.ts:254`).
  `HeadsStore` (LevelDB) is no longer instantiated anywhere.
- **Query index** → lives in `@dxos/index-core`, SQLite-backed. No `level`
  sublevels are written at boot; `createStorageObjects` no longer returns a
  `level`.
- **Profile export/import (browser)** → composer-app `recovery/` already uses
  `createSqliteProfileArchive` / `getSqliteProfileEntries` over OPFS SQLite.
- **The only remaining runtime `level` opens** are:
  - `client.repair()` — deletes stale `index-store` / `index-metadata`
    sublevels left over from the pre-SQLite era (orphaned bytes; cleanup only).
  - `devtools.ts` `exportProfile` / `importProfile` hooks (Node/electron) and
    the `plugin-client` `profile import` CLI command — both open a Level via
    `createLevel` and call `exportProfileData` / `importProfileData`.

### Key insight — Node export/import needs no new SQLite pipeline

On Node, all persistent data (including the SQLite DB file) is captured by the
`FILE` entries of `exportProfileData` (it iterates the random-access `storage`
directory, which is SQLite-backed via `sqlite-storage.ts`). The `KEY_VALUE`
(Level) branch was a _separate, now-empty_ store. So converting = **drop the
`level` param and the `KEY_VALUE` case**, keep `FILE` + `SQLITE_DATABASE`.

## Behavior change (accepted)

Importing a **legacy `.dxprofile` archive that contains `KEY_VALUE` entries**
will no longer restore those entries (they are skipped with a warning) — there
is no Level store to write them to. Export has emitted `FILE` (Node) /
`SQLITE_DATABASE` (browser), not `KEY_VALUE`, for some time, and this is pre-1.0.
The `ProfileArchiveEntryType.KEY_VALUE = 2` enum value is **kept** for wire/CBOR
stability; only its handler is removed.

## Removal surface

### echo-host (`packages/core/echo/echo-host`)

- Delete `automerge/leveldb-storage-adapter.ts`, `automerge/heads-store.ts`.
- Relocate `StorageAdapterDataMonitor` (consumed by `sqlite-storage-adapter.ts`)
  out of the deleted file — into `sqlite-storage-adapter.ts`.
- Remove `export * from './leveldb-storage-adapter'` in `automerge/index.ts`.
- Convert `automerge/subduction-test-utils.ts` `createLevelAdapter` → SQLite
  (reuse `testing/sqlite-test-runtime.ts` `createTestSqliteRuntime`).
- Convert `automerge/automerge-repo.test.ts` (drop `createTestLevel`, incl. the
  persistence cases that reopen a path → use a file-based SQLite runtime).
- Delete `automerge/storage-adapter.test.ts` — fully redundant with
  `sqlite-storage-adapter.test.ts`.
- Drop `@dxos/kv-store` and `level-transcoder` from `package.json`.

### client-services (`packages/sdk/client-services`)

- Delete `packlets/storage/level.ts` (`createLevel`).
- `packlets/storage/profile-archive.ts`: keep `encode/decodeProfileArchive`
  (pure CBOR); drop `level` param + `KEY_VALUE` case from
  `exportProfileData` / `importProfileData`.
- Update `packlets/storage/index.ts` export list.
- Drop `@dxos/kv-store` from `package.json`.

### client (`packages/sdk/client`)

- `client/client.ts` `repair()` — remove the Level cleanup block (+ its summary
  field).
- `devtools/devtools.ts` — drop `createLevel` from `exportProfile`/`importProfile`.

### plugin-client (`packages/plugins/plugin-client`)

- `commands/profile/import.ts` — drop `createLevel`; import via FILE entries.

### blade-runner (`packages/e2e/blade-runner`)

- `replicants/storage-replicant.ts`, `replicants/automerge-replicant.ts` —
  remove the `LevelDBStorageAdapter` adapter kind (keep IndexedDB; SQLite where
  applicable).
- `replicants/echo-replicant.ts` — replace `createTestLevel` for the EchoTestPeer
  `kv` (verify EchoTestPeer's storage expectations).
- Drop `@dxos/kv-store` + `createLevel` import from `package.json` / code.

### package + catalog

- Delete `packages/common/kv-store` entirely.
- Remove `@dxos/kv-store` from `package.json` of: compute-runtime, echo-client,
  sdk/client, composer-app; from `app-framework` `DEFAULT_PACKAGES`; from
  `.changeset/config.json` linked group.
- Remove `level`, `abstract-level`, `level-transcoder` from the
  `pnpm-workspace.yaml` catalog; remove `classic-level` from built-dependencies.
- `pnpm install` to refresh the lockfile.
- Add a changeset.

## Verification

- `moon run <pkg>:build` for each touched package; converted tests green.
- `pnpm format`, `moon run :lint -- --fix` on touched files.
- Grep proves zero `level` / `abstract-level` / `@dxos/kv-store` references remain.
