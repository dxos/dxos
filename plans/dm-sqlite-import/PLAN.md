# SQLite OPFS Profile Import

> **Branch:** `dm/sqlite-import` · **Prior work:** [2026-06-07-composer-recovery-import](../2026-06-07-composer-recovery-import.md) (PR [#11717](https://github.com/dxos/dxos/pull/11717))

**Goal:** Make `.dxprofile` import from Composer recovery mode work correctly end-to-end — bytes land in OPFS with valid `AccessHandlePoolVFS` headers, the OPFS SQLite worker opens the database, and recovery client boot succeeds on real profiles.

**Architecture (today):**

```text
.dxprofile / .sqlite
  → decodeProfileArchive / header check          (@dxos/client-services)
  → importOpfsDatabaseViaWorker                  (recovery/opfs-worker-bridge.ts)
  → opfs-pool-worker.ts
  → writePoolSqlitePayload                       (@dxos/sql-sqlite/opfs-pool-sync)
  → verifyOpfsSqliteImport                       (async OPFS read — no second sqlite worker)

recovery.startClient()
  → LocalClientServices (HOST, sqliteMode=OPFS)
  → dedicated OpfsWorker                         (@dxos/sql-sqlite/OpfsWorker)
  → AccessHandlePoolVFS opens /DXOS from opfs/ pool
```

**Test profile (dev):** `/tmp/composer-forensics/main.composer.space-test/main.composer.space.dxprofile` (~124 MB) — served at `/test-fixtures/main.composer.space.dxprofile` when present ([vite.config.ts](../../packages/apps/composer-app/vite.config.ts)).

---

## Status checklist

| Step | Task                                                          | Status |
| ---- | ------------------------------------------------------------- | ------ |
| A1   | Reproduce import + boot failure on branch                     | ⬜     |
| A2   | Fix OPFS pool import (if still broken)                        | ⬜     |
| A3   | Add browser tests for `writePoolSqlitePayload` roundtrip      | ⬜     |
| A4   | Add browser test: `.dxprofile` decode → pool write → verify   | ⬜     |
| A5   | Recovery E2E: import → `startClient()` → diagnostics pass     | ⬜     |
| B1   | Audit `@dxos/sql-sqlite` browser test coverage                | ✅     |
| B2   | Un-skip or replace skipped OPFS browser tests                 | ✅     |
| B3   | Wire `moon run sql-sqlite:test-browser` in CI path            | ✅     |
| C1   | Spike: in-worker SqliteClient without MessagePort             | ⬜     |
| C2   | Decision: fork `@effect/sql-sqlite-wasm` vs thin direct layer | ⬜     |
| C3   | Implement chosen path for `LocalSqliteOpfsLayer`              | ⬜     |

---

## Subgoal A — Fix and test DB import in SQLite OPFS

### Known context from prior branch

Prior work on `dm/composer-forensics` fixed:

- Vite worker resolve for `opfs-pool-sync`
- **Header flag endianness** — `writePoolSqlitePayload` must write big-endian flags (match `AccessHandlePoolVFS`)
- Async verification after import (avoid opening a second OPFS sqlite worker, which can disassociate/truncate pool files)

**Still open:** booting recovery client on a 124 MB imported profile hung >3 min; full compact migration never validated on live data.

### A1 — Reproduce and characterize

Run recovery dev server and debug port smoke tests:

```bash
moon run composer-app:serve --quiet
# In another terminal (requires test fixture on disk):
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> \
  'return (async () => { await recovery.reset(); return await recovery.importProfileFromUrl("/test-fixtures/main.composer.space.dxprofile"); })()'

node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> \
  'return (async () => { await recovery.inspectOpfsPool(); return await recovery.diagnostics(); })()'

node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> \
  'return recovery.startClient()'
```

Record:

1. Import `byteLength` vs source file size
2. `inspectOpfsPool()` — `/DXOS` associated path, payload bytes
3. Whether boot completes, hangs, or throws
4. Whether a failed boot truncates OPFS payload (regression for endianness bug)

### A2 — Import path fixes (if needed)

Two import mechanisms exist; recovery uses **pool sync**, not OpfsWorker deserialize:

| Path          | Module                          | Mechanism                             | Used by                         |
| ------------- | ------------------------------- | ------------------------------------- | ------------------------------- |
| Pool sync     | `opfs-pool-sync.ts`             | Raw bytes at offset 4096 + VFS header | Recovery import                 |
| Worker import | `OpfsWorker.ts` `['import', …]` | `deserialize` + `VACUUM` on open DB   | Client export/import API (host) |

Investigate if failures are:

1. **Pool write** — header digest/path/flags, journal cleanup, pool slot selection
2. **Worker open** — imported bytes not compatible with `AccessHandlePoolVFS` layout (pool sync should write final on-disk form; deserialize path is different)
3. **IndexedDB gap** — `.dxprofile` archives may also contain KEY_VALUE / FILE entries; recovery currently imports **SQLITE_DATABASE only**. Confirm whether a complete restore also needs IndexedDB entries from the same archive (see `importProfileData` skipping SQLITE_DATABASE in [profile-archive.ts](../../packages/sdk/client-services/src/packlets/storage/profile-archive.ts))

Likely fix locations:

- [opfs-pool-sync.ts](../../packages/common/sql-sqlite/src/opfs-pool-sync.ts)
- [opfs-pool.ts](../../packages/apps/composer-app/src/recovery/opfs-pool.ts) (async read path — keep in sync with sync writer)
- [opfs-import-verify.ts](../../packages/apps/composer-app/src/recovery/opfs-import-verify.ts) (tighten checks: `integrity_check` pragma via in-memory deserialize of payload slice?)

### A3 — Browser tests: `writePoolSqlitePayload`

Add `packages/common/sql-sqlite/src/testing/opfs-pool-sync.browser.test.ts`:

1. Create minimal valid SQLite bytes in test (reuse header helper from `profile-archive-sqlite.test.ts` or small in-memory DB via wa-sqlite serialize)
2. Run `writePoolSqlitePayload('DXOS', bytes)` inside a **sync-access worker** (same pattern as `opfs-pool-worker.ts`)
3. Read back via async OPFS API (mirror `readOpfsSqliteDatabase` logic or import shared read helper into `@dxos/sql-sqlite`)
4. Assert: SQLite magic at payload, byte length, associated path `/DXOS`, digest valid

Run: `moon run sql-sqlite:test -- src/testing/opfs-pool-sync.browser.test.ts`

### A4 — Browser test: dxprofile roundtrip

Add test in `client-services` **or** `sql-sqlite` (prefer extending existing suite):

- `createSqliteProfileArchive` → CBOR encode → decode → `getSqliteProfileEntries` → pool write → verify

Node coverage already exists in [profile-archive-sqlite.test.ts](../../packages/sdk/client-services/src/packlets/storage/profile-archive-sqlite.test.ts); browser test closes the OPFS gap.

### A5 — Recovery E2E acceptance

Manual + optional playwright/debug-port automation:

1. `recovery.reset()`
2. `recovery.importProfileFromUrl(...)` or file picker
3. `recovery.diagnostics()` — identity, spaces, sqlite stats
4. `recovery.startClient()` — must complete within reasonable timeout
5. Post-boot: query spaces, no OPFS truncation

**Done when:** 124 MB fixture imports, boots, and diagnostics match offline extract expectations.

---

## Subgoal B — Review SQLite OPFS test coverage (Vitest browser)

### Current inventory (`@dxos/sql-sqlite`)

| File                                | Status             | Covers                                    |
| ----------------------------------- | ------------------ | ----------------------------------------- |
| `sqlite-memory.browser.test.ts`     | ✅ active          | wa-sqlite in-memory CRUD                  |
| `opfs-worker.browser.test.ts`       | ⏭ `describe.skip` | Effect `SqliteClient.layer` + OPFS worker |
| `sqlite-idb.browser.test.ts`        | ⏭ skip            | IDBBatchAtomicVFS (broken)                |
| `sqlite-effect-idb.browser.test.ts` | ⏭ skip            | Effect client + IDB VFS                   |
| `opfs-pool-sync.ts`                 | ❌ none            | Pool header write (critical for recovery) |
| `OpfsWorker.ts` import/export       | ❌ none            | deserialize + VACUUM path                 |

Package config: [vitest.config.ts](../../packages/common/sql-sqlite/vitest.config.ts) — browser project `chromium`; moon tag `ts-test-browser`.

### B1 — Coverage audit output

Produce a short table in this plan (or `findings.md` sibling) documenting:

- What each skipped test blocked on
- Minimum tests needed for recovery import confidence
- Whether IDB VFS tests stay deferred (not on critical path for Composer OPFS)

### B2 — Enable OPFS worker test

Priority order:

1. **`opfs-pool-sync.browser.test.ts`** (new — subgoal A3)
2. **Un-skip `opfs-worker.browser.test.ts`** — fix Vite WASM/worker URL issues if any; validates SqliteClient ↔ OpfsWorker message protocol
3. Add **`OpfsWorker` import/export** case: write small DB → export message → import into fresh worker → SELECT

Keep IDB tests skipped unless needed; document reason in test file header.

### B3 — CI

Confirm `sql-sqlite:test` browser project runs in Check workflow (moon `ts-test-browser` tag). If flaky, apply same retry policy as storybook browser tests in [vitest.base.config.ts](../../vitest.base.config.ts).

---

## Subgoal C — Fork / inline SQLite WASM (avoid MessagePort in worker)

### Problem

Today `@dxos/sql-sqlite` **re-exports** `@effect/sql-sqlite-wasm` for `SqliteClient` and partially forks `OpfsWorker`:

- [OpfsWorker.ts](../../packages/common/sql-sqlite/src/OpfsWorker.ts) — local copy with logging + import/export messages
- [SqliteClient.ts](../../packages/common/sql-sqlite/src/SqliteClient.ts) — re-export from Effect; always talks to worker via `postMessage`
- [index.ts](../../packages/common/sql-sqlite/src/index.ts) — exports Effect's OpfsWorker (stale; package.json `./OpfsWorker` entry correctly points at local build)

**Recovery / main thread:** dedicated worker + MessagePort (necessary).

**Worker runtime:** [LocalSqliteOpfsLayer](../../packages/sdk/client-services/src/packlets/worker/worker-runtime.ts) already runs `OpfsWorker.run` **in the same worker** but still uses an internal `MessageChannel` to `SqliteClient.layer` — adds serialization overhead and is marked **broken** (`TODO(mykola): This does not work right now. Fix.`).

### C1 — Spike

Implement `SqliteClient.layerDirect` (name TBD) that:

1. Opens wa-sqlite + `AccessHandlePoolVFS` in-process (reuse connection logic from `OpfsWorker.run`)
2. Exposes same `SqlClient` interface as Effect client
3. Keeps `export` / `import` on the connection object

Validate in `test-worker-factory` or a new browser test running inside a worker context.

### C2 — Decision matrix

| Option                                                                         | Pros                                                   | Cons                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- |
| **A. Full fork** of `@effect/sql-sqlite-wasm` into `@dxos/sql-sqlite`          | Own release cycle, no devDependency on Effect wasm pkg | Upstream merge burden                         |
| **B. Direct connection layer only** — keep Effect SqliteClient for worker mode | Smaller diff, fixes `LocalSqliteOpfsLayer`             | Two code paths to maintain                    |
| **C. Replace MessageChannel with in-memory port shim**                         | Minimal API change                                     | Still mimics protocol; doesn't remove copying |

**Recommendation:** Start with **B** — add `layerOpfsDirect` used by `LocalSqliteOpfsLayer`; keep worker `SqliteClient.layer({ worker })` for main-thread recovery and composer-app. Revisit full fork if Effect wasm API churn blocks import/export fixes.

### C3 — Wire `LocalSqliteOpfsLayer`

Replace MessageChannel wiring in [worker-runtime.ts](../../packages/sdk/client-services/src/packlets/worker/worker-runtime.ts) with direct layer; remove or update TODO. Ensure dedicated-worker and shared-worker tests still pass:

- `packages/sdk/client/src/tests/shared-worker.test.ts`
- `packages/sdk/client/src/testing/test-worker-factory.ts`

**Out of scope for first PR:** changing recovery main-thread architecture (pool worker stays separate — sync access handles require dedicated worker).

---

## Key files

| File                                                                          | Role                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/apps/composer-app/src/recovery/import-sqlite.ts`                    | `.dxprofile` / `.sqlite` picker + decode |
| `packages/apps/composer-app/src/recovery/opfs-worker-bridge.ts`               | Pool worker bridge + verify              |
| `packages/apps/composer-app/src/recovery/opfs-pool-worker.ts`                 | Sync OPFS write worker                   |
| `packages/common/sql-sqlite/src/opfs-pool-sync.ts`                            | `writePoolSqlitePayload`                 |
| `packages/common/sql-sqlite/src/OpfsWorker.ts`                                | OPFS sqlite worker (forked Effect)       |
| `packages/sdk/client-services/src/packlets/storage/profile-archive-sqlite.ts` | Archive encode/decode helpers            |
| `packages/sdk/client/src/services/local-client-services.ts`                   | Main-thread OPFS worker client           |
| `packages/sdk/client-services/src/packlets/worker/worker-runtime.ts`          | In-worker sqlite (MessageChannel today)  |
| `.agents/skills/composer-forensics/`                                          | Recovery debug port + offline extract    |

---

## Suggested execution order

1. **A1** reproduce (blocks everything else)
2. **A3 + A4** browser tests (TDD for pool import)
3. **A2 + A5** fix + E2E acceptance
4. **B1–B3** coverage hardening in parallel with A
5. **C1–C3** after import path is green (performance / worker-runtime; not required for recovery import MVP)

---

## Commands

```bash
# Build + test sql-sqlite (node + browser)
moon run sql-sqlite:build
moon run sql-sqlite:test
moon run sql-sqlite:test -- src/testing/opfs-pool-sync.browser.test.ts

# Profile archive unit tests (node)
moon run client-services:test -- src/packlets/storage/profile-archive-sqlite.test.ts

# Recovery dev
moon run composer-app:serve --quiet
```

---

## OPFS test isolation note

OPFS sync access handles and the sqlite worker must not overlap in the same origin:

- `writePoolSqlitePayload` fails if an OpfsWorker still holds the pool file open.
- Tests use numeric prefixes (`00-`, `01-`, `02-`) and explicit `shutdownWorker()` in protocol tests.
- SqliteClient `export`/`import` via Effect layer can hang when run back-to-back; import/export is covered via raw worker protocol tests instead.

1. Does a **full** `.dxprofile` restore require IndexedDB KEY_VALUE entries in addition to SQLITE_DATABASE, or is OPFS-only sufficient for recovery use case?
2. Is boot hang on 124 MB profile sqlite migration, automerge hydration, or OPFS open?
3. Should pool read helpers move from `composer-app/recovery/opfs-pool.ts` into `@dxos/sql-sqlite` for shared testing?
