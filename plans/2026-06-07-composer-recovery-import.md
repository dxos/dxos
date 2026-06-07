# Composer Recovery Import & Remote Control Plan

> **Branch:** `dm/composer-forensics` · **PR:** [#11717](https://github.com/dxos/dxos/pull/11717)

**Goal:** Ship Composer recovery mode with working OPFS profile import (including live-exported `.dxprofile`), debug-port remote control, and document compaction migration — then land the PR.

**Architecture:** Recovery page (`/recovery.html`) exposes static `dxos.recovery.*` helpers. Import writes raw SQLite into the OPFS pool via a dedicated sync-access-handle worker (`opfs-pool-worker.ts` → `writePoolSqlitePayload`). Verification reads OPFS asynchronously (no second SQLite worker). Debug port (`composer-recovery.js`) evaluates snippets with `recovery` in scope.

**Test profile:** `/tmp/composer-forensics/main.composer.space-test/main.composer.space.dxprofile` (124 MB, exported from live Composer) — served at `/test-fixtures/main.composer.space.dxprofile` in dev.

---

## Status checklist

| Step | Task | Status |
|------|------|--------|
| 1 | OPFS pool worker import path (fix Vite resolve error) | ✅ |
| 2 | Fix OPFS header flag endianness (match AccessHandlePoolVFS) | ✅ |
| 3 | Import live-exported `.dxprofile` persists ~124 MB in OPFS | ✅ |
| 4 | OPFS survives client open attempt (no truncate to 4 KB) | ✅ |
| 5 | Remote control: `recovery.startClient()` on empty profile | ✅ |
| 6 | Remote control: `recovery.compactDocuments()` API wired | ✅ |
| 7 | Boot imported 124 MB profile + compact end-to-end | ⬜ follow-up (boot >3 min hang) |
| 8 | Tests + lint pass locally | ⬜ in progress |
| 9 | Commit, push, update PR description | ⬜ |
| 10 | Wait for CodeRabbit review | ⬜ |
| 11 | Address CodeRabbit comments | ⬜ |
| 12 | `/land` — CI green, auto-merge | ⬜ |

---

## Task 1: Fix OPFS pool worker module resolution

**Problem:** Vite failed with `Failed to resolve import "@dxos/sql-sqlite/opfs-pool-sync"`.

**Fix:** Import from monorepo source in worker:

```ts
import { writePoolSqlitePayload } from '../../../../common/sql-sqlite/src/opfs-pool-sync';
```

- [x] Worker loads without Vite error
- [x] Import succeeds

---

## Task 2: Fix OPFS pool header endianness

**Problem:** `writePoolSqlitePayload` wrote flags as little-endian; `AccessHandlePoolVFS` reads big-endian → wrong flags → file disassociated and truncated on client boot.

**Fix:** Use default big-endian in `opfs-pool-sync.ts` and `opfs-pool.ts`:

```ts
dataView.setUint32(HEADER_OFFSET_FLAGS, flags); // no `true` for littleEndian
```

- [x] After import + failed boot, pool still shows 124,129,280 payload bytes

---

## Task 3: End-to-end import verification

```bash
node composer-recovery.js --session <uuid> \
  'return (async () => { await recovery.reset(); return await recovery.importProfileFromUrl("/test-fixtures/main.composer.space.dxprofile"); })()'
```

- [x] `byteLength: 124129280`, pool `/DXOS` payload matches

---

## Task 4: Remote compact migration

```bash
# Empty profile — API smoke test
node composer-recovery.js --session <uuid> \
  'return (async () => { await recovery.reset(); await recovery.startClient(); return recovery.compactDocuments(); })()'
# → "No spaces in profile." (expected on empty)

# Imported profile — boot currently hangs >3 min (follow-up)
```

- [x] `recovery.compactDocuments()` callable via debug port
- [ ] Full compact on imported live profile (blocked on boot hang)

---

## Task 5: CI, commit, PR, land

- [ ] `pnpm format` + lint + targeted tests
- [ ] Commit all recovery changes
- [ ] Push to `dm/composer-forensics`, update PR #11717
- [ ] Wait for CodeRabbit, address comments
- [ ] `/land`

---

## Key files

| File | Role |
|------|------|
| `packages/apps/composer-app/src/recovery/opfs-pool-worker.ts` | Sync OPFS write worker |
| `packages/common/sql-sqlite/src/opfs-pool-sync.ts` | `writePoolSqlitePayload` |
| `packages/apps/composer-app/src/recovery/compact-documents.ts` | Epoch compaction |
| `.agents/skills/composer-forensics/scripts/composer-recovery.js` | Debug port server |
| `plans/2026-06-07-composer-recovery-import.md` | This plan |
