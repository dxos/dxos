---
name: composer-forensics
description: >-
  Extract and validate data from live Composer browser profiles on disk (Chrome OPFS,
  IndexedDB, SQLite). Use when forensically inspecting main.composer.space or other
  Composer origins, extracting the DXOS SQLite database from OPFS, or validating profile
  integrity on a local machine.
---

# Composer forensics

Extract Composer client data from a **live Chrome profile on disk**, then validate and analyze offline.

**Scope (v1):** macOS + Google Chrome default profile. Generalize paths for other profiles/channels as needed.

## When to use

- User asks to inspect, extract, dump, or forensically analyze a Composer profile.
- Debugging data loss, corruption, or unexpected state on `main.composer.space`, `labs.composer.space`, or preview deploys.
- Offline SQL analysis of feeds, objects, automerge chunks, blobs, or indexes.

## Safety

1. **Read-only by default** — copy blobs out; do not delete or modify Chrome profile files unless the user explicitly asks.
2. **Consistency** — Chrome may have the DB open. Prefer closing Composer tabs before extraction. A hot copy can still be valid for read-mostly forensics but may fail `PRAGMA integrity_check`.
3. **Privacy** — extracted data may contain credentials, keys, and user content. Keep output under `/tmp` or a user-specified directory; do not commit extracts.

## Quick start

```bash
# 1. Locate origin → OPFS directory (see STORAGE.md)
python3 .agents/skills/composer-forensics/scripts/locate-origin.py \
  --origin https://main.composer.space

# 2. Extract SQLite from OPFS pool blobs
python3 .agents/skills/composer-forensics/scripts/extract-opfs-sqlite.py \
  --opfs-dir "$OPFS_DIR" \
  --out /tmp/composer-forensics/main.composer.space

# 3. Validate extract
bash .agents/skills/composer-forensics/scripts/validate-extract.sh \
  /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

## Workflow checklist

Copy and track progress:

```
Forensics progress:
- [ ] Identify target origin and Chrome profile
- [ ] Resolve OPFS directory ID (File System/Origins LevelDB)
- [ ] List OPFS pool blobs and associated paths (/DXOS, /DXOS-journal, …)
- [ ] Extract to output dir (strip 4096-byte AccessHandlePoolVFS headers)
- [ ] Run validate-extract.sh
- [ ] Run ad-hoc SQL / domain validation (see VALIDATION.md)
- [ ] Record findings in MEMORY.md (dated section)
```

## Architecture (what you are extracting)

Composer persists ECHO data in a single OPFS-backed SQLite database:

| Layer | Detail |
|-------|--------|
| Browser API | `navigator.storage.getDirectory()` → OPFS root |
| VFS | `@dxos/wa-sqlite` `AccessHandlePoolVFS` (`opfs/` subdirectory) |
| DB name | `DXOS` (`packages/sdk/client-services/src/packlets/worker/worker-runtime.ts`) |
| On-disk pool files | Random names under OPFS; header path `/DXOS` = main DB, `/DXOS-journal` = rollback journal |
| Header size | **4096 bytes**; SQLite payload starts at offset 4096 |

OPFS is **not** IndexedDB. Related but separate storage for the same origin:

- `~/Library/Application Support/Google/Chrome/Default/IndexedDB/https_<host>_0.indexeddb.leveldb`
- Log store (if used): separate IndexedDB DB name from `@dxos/log-store-idb`

## Extraction output layout

```
/tmp/composer-forensics/<origin-slug>/
├── DXOS.sqlite              # Main DB (strip header from largest /DXOS blob)
├── DXOS-journal.bin         # Rollback journal (optional; not standalone SQLite)
├── manifest.json            # Paths, sizes, source opfs dir, timestamp
└── raw-opfs-blobs/          # Original Chrome blobs (with headers)
```

## Validation phases

### Phase 1 — File-level (automated)

Run `scripts/validate-extract.sh`. Checks:

- SQLite magic (`SQLite format 3`)
- `PRAGMA integrity_check`
- Expected table inventory (see VALIDATION.md)
- Baseline row counts on core tables

### Phase 2 — Domain-level (manual / follow-up)

After file-level passes, run targeted queries:

- **Spaces:** `space_metadata`, `space_large`
- **Objects:** `objectMeta` (by `spaceId`, `typeDXN`, `deleted`)
- **Automerge:** `automerge_chunks`, `automerge_heads`
- **Feeds/queues:** `feeds`, `blocks`, `cursor_tokens`
- **Blobs:** `blobs_meta`, `blobs_data`
- **Keys:** `keyring` (handle carefully — secrets)

See [VALIDATION.md](VALIDATION.md) for query templates and expected tables.

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| No `SQLite format 3` after strip | Wrong blob or corrupt header | Re-run `locate-origin.py`; inspect headers with `xxd -l 32` on each blob |
| `integrity_check` fails | Hot copy while Chrome open | Close tabs; re-extract; or use `sqlite3 .recover` as last resort |
| Origin not in Origins DB | Never visited, different profile, or cleared site data | Check `IndexedDB/https_*` folder names; try another profile |
| Empty OPFS dir | Site data cleared | Confirm user still has data in live Composer |

## Browser-side export (alternative)

The OPFS worker supports in-browser serialize (`OpfsWorker` `export` message → `sqlite3.serialize`). Prefer **disk extraction** for forensics on a live profile without driving the browser; use in-browser export when Chrome profile path is unavailable.

## Additional resources

- [STORAGE.md](STORAGE.md) — Chrome paths, origin mapping, OPFS on-disk format
- [VALIDATION.md](VALIDATION.md) — SQL checks and table reference
- [MEMORY.md](MEMORY.md) — session notes (append dated findings)
- `logging` skill — query Composer dev `app.log` when reproducing in dev, not production profile
