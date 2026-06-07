---
name: composer-forensics
description: >-
  Extract and validate data from live Composer browser profiles on disk (Chrome OPFS,
  IndexedDB, SQLite). Use when forensically inspecting Composer origins, extracting the
  DXOS SQLite database from OPFS, debugging Automerge load perf (binary vs JSON size,
  mutation/op breakdown), building maintainer escalation bundles, or validating profile
  integrity locally.
---

# Composer forensics

Extract Composer client data from a **live Chrome profile on disk**, validate, and analyze offline.

**Full command reference:** [COMMANDS.md](COMMANDS.md) — locate, extract, validate, probe, automerge, SQL, troubleshooting.

**Scope (v1):** macOS + Google Chrome default profile.

## When to use

- Inspect, extract, dump, or forensically analyze a Composer profile.
- Debug data loss, corruption, or unexpected state on `main.composer.space`, `labs.composer.space`, or preview deploys.
- Offline analysis of identity, spaces, feeds, objects, automerge documents.

## Safety

1. **Read-only by default** — copy blobs out; do not modify Chrome profile files unless asked.
2. **Consistency** — close Composer tabs before extraction when you need clean `integrity_check`.
3. **Privacy** — extracts may contain keys and user content; keep under `/tmp`; never commit.

## Pipeline (always in this order)

```
locate → extract → validate → probe → (automerge …) → record in MEMORY.md
```

### 1. Locate

```bash
python3 .agents/skills/composer-forensics/scripts/locate-origin.py \
  --origin https://main.composer.space
```

### 2. Extract

```bash
python3 .agents/skills/composer-forensics/scripts/extract-opfs-sqlite.py \
  --opfs-dir "<opfs_pool_dir from locate>" \
  --out /tmp/composer-forensics/main.composer.space
```

### 3. Validate

```bash
bash .agents/skills/composer-forensics/scripts/validate-extract.sh \
  /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

### 4. Probe (JS — uses `@dxos` packages)

```bash
export PROTO_HOME="$HOME/.proto" PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
node .agents/skills/composer-forensics/scripts/probe.js \
  /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

### 5. Automerge — find largest doc

```bash
cd .agents/skills/composer-forensics/scripts
node automerge-list.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

### 6. Automerge — binary vs JSON size (perf debugging)

```bash
node automerge-inspect.js /tmp/.../DXOS.sqlite --largest
node automerge-inspect.js /tmp/.../DXOS.sqlite <document-id>
```

High **binary / JSON ratio** + high **ops / MiB** usually means history bloat: storage and load cost far exceed reified document size.

### 7. Automerge — mutation analysis

```bash
node automerge-inspect.js /tmp/.../DXOS.sqlite <document-id> --mutations
```

Decodes all changes and reports op action breakdown (dominant `set` ops → whole-array replacement pattern).

### 8. Automerge — escalate to maintainers

```bash
node automerge-escalate.js /tmp/.../DXOS.sqlite --largest --out-dir /tmp/am-escalation
```

Produces `<document-id>.bin` (merged binary) + `<document-id>-report.md` (stats, hypothesis, repro steps) for Automerge issue reports.

### 9. Automerge — bench load

```bash
node automerge-bench-load.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite --largest
node automerge-bench-load.js /tmp/.../DXOS.sqlite <document-id>
```

## Composer recovery mode (in-app)

When Composer cannot boot (e.g. Automerge bloat), open **`/recovery.html`** on the same origin:

| Action | What it does |
|--------|----------------|
| **Export SQLite** | OPFS worker only — downloads raw `DXOS.sqlite` bytes (no client/plugins/sync) |
| **Reset** | Wipe origin storage (same as `/reset.html`) |
| **Open Debug Port** | Long-poll `http://127.0.0.1:9321` for agent-driven JS snippets |

Agent debug server (from this skill):

```bash
cd .agents/skills/composer-forensics/scripts
node composer-recovery.js 'return await recovery.exportSqlite()'
node composer-recovery.js --interactive
```

Snippets run with `recovery` in scope (`recovery.status()`, `recovery.exportSqlite()`, `recovery.reset()`, `recovery.log()`).

**HTTPS note:** production origins may block `http://127.0.0.1` fetch (mixed content). Export/Reset still work; use local `vite serve` for debug port on HTTPS profiles, or forensics offline on exported SQLite.

See [LINEAR-tagindex-write-amplification.md](LINEAR-tagindex-write-amplification.md) for the TagIndex bloat recovery path.

## Workflow checklist

```
Forensics progress:
- [ ] locate-origin.py
- [ ] extract-opfs-sqlite.py
- [ ] validate-extract.sh
- [ ] probe.js (summary)
- [ ] automerge-list.js (or `automerge list`)
- [ ] automerge-inspect.js for binary vs JSON ratio on slow/large docs
- [ ] automerge-inspect.js --mutations when ratio is high (check op breakdown)
- [ ] automerge-escalate.js if escalating to Automerge maintainers
- [ ] automerge-bench-load.js for slow doc candidates
- [ ] `/recovery.html` if app won't boot — export SQLite before reset
- [ ] `composer-recovery.js` + Open Debug Port for live agent commands
- [ ] MEMORY.md updated; promote findings to LINEAR doc if filing an issue
```

## Known issue pattern: TagIndex write amplification

High **binary / JSON ratio** (e.g. >50×) with dominant **`set` ops** on a small reified doc usually means `TagIndex` whole-array replacement — see [LINEAR-tagindex-write-amplification.md](LINEAR-tagindex-write-amplification.md) for root cause, evidence, and fix plan.

## `scripts/src/` modules

| Module | Role |
|--------|------|
| `src/automerge-size.js` | Binary vs JSON analysis |
| `src/automerge-mutations.js` | Change decode, op breakdown, hypotheses |
| `src/automerge-escalate.js` | Maintainer bundle writer |
| `src/automerge-load.js` | Timed load + largest-doc helper |
| `src/automerge-chunks.js` | Chunk load/merge (StorageSubsystem order) |
| `src/automerge-keys.js` | Chunk key encode/decode |
| `src/automerge.js` | Document listing |
| `src/automerge-dump.js` | `.bin` + `.json` dump |
| `src/db.js`, `src/metadata.js`, `src/summary.js`, `src/format.js` | Probe helpers |

Use `src/`, not `lib/` — repo `.gitignore` ignores `lib/`.

## Architecture

| Layer | Detail |
|-------|--------|
| OPFS pool | Chrome `File System/<ID>/t/00/` — see [STORAGE.md](STORAGE.md) |
| VFS header | 4096 bytes; SQLite at offset 4096 (`AccessHandlePoolVFS`) |
| DB name | `DXOS` |
| Metadata | `space_metadata.key = 'main'` → `EchoMetadata` protobuf |
| Automerge | `automerge_heads`, `automerge_chunks` |

## Scripts

| Script | Role |
|--------|------|
| `locate-origin.py` | Origin → OPFS path |
| `extract-opfs-sqlite.py` | Blobs → `DXOS.sqlite` |
| `validate-extract.sh` | File-level checks |
| `probe.js` | Profile summary + automerge subcommands |
| `automerge-list.js` | Document ids + combined binary sizes |
| `automerge-inspect.js` | Binary vs reified JSON size; `--mutations` for op breakdown |
| `automerge-escalate.js` | Maintainer bundle: `.bin` + `-report.md` |
| `automerge-bench-load.js` | Size comparison + loadIncremental timing |
| `automerge-dump-json.js` | Dump `.bin` + `.json` with size report |
| `composer-recovery.js` | Debug server for Composer `/recovery.html` |

Probe package: `@dxos/composer-forensics` in `scripts/package.json` (workspace; run `pnpm install` from repo root).

## Additional resources

- [COMMANDS.md](COMMANDS.md) — every command documented
- [STORAGE.md](STORAGE.md) — Chrome on-disk layout
- [VALIDATION.md](VALIDATION.md) — SQL templates
- [MEMORY.md](MEMORY.md) — session notes
- [LINEAR-tagindex-write-amplification.md](LINEAR-tagindex-write-amplification.md) — Linear issue draft (root cause + fix plan)
