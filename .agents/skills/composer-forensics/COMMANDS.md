# Composer forensics — commands

Complete reference for extracting and analyzing a live Composer Chrome profile on this machine.

**Requirements:** Node.js 24+ (via `proto`), Python 3, `sqlite3` CLI, Google Chrome.

Run all commands from the **repo root** unless noted.

---

## 1. Locate origin storage

Find where Chrome stores OPFS for a Composer origin.

```bash
python3 .agents/skills/composer-forensics/scripts/locate-origin.py \
  --origin https://main.composer.space
```

Options:

| Flag        | Default                        | Description              |
| ----------- | ------------------------------ | ------------------------ |
| `--origin`  | `https://main.composer.space`  | Target origin URL        |
| `--profile` | `~/Library/.../Chrome/Default` | Chrome profile directory |
| `--json`    | off                            | Machine-readable output  |

Output fields:

- `file_system_dir_id` — numeric OPFS directory (e.g. `118`)
- `opfs_pool_dir` — path to `File System/<ID>/t/00/` blobs
- `indexeddb_dir` — companion IndexedDB path (separate from OPFS)

### Other origins

```bash
python3 .agents/skills/composer-forensics/scripts/locate-origin.py --origin https://labs.composer.space
python3 .agents/skills/composer-forensics/scripts/locate-origin.py --origin http://localhost:5173
```

### Chrome variants (macOS)

Replace profile base:

- Chrome Beta: `~/Library/Application Support/Google/Chrome Beta/Default`
- Canary: `~/Library/Application Support/Google/Chrome Canary/Default`

---

## 2. Extract SQLite from OPFS

Strip the 4096-byte `AccessHandlePoolVFS` header from Chrome pool blobs.

```bash
OPFS_DIR="$(python3 .agents/skills/composer-forensics/scripts/locate-origin.py \
  --origin https://main.composer.space --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["opfs_pool_dir"])')"

python3 .agents/skills/composer-forensics/scripts/extract-opfs-sqlite.py \
  --opfs-dir "$OPFS_DIR" \
  --out /tmp/composer-forensics/main.composer.space
```

Output:

```
/tmp/composer-forensics/main.composer.space/
├── DXOS.sqlite           # Main database
├── DXOS-journal.bin      # Rollback journal (optional)
├── manifest.json         # Extraction metadata
└── raw-opfs-blobs/       # Original Chrome blobs
```

**Before extracting:** close Composer tabs for that origin when you need a consistent copy or clean `integrity_check`.

---

## 2b. Wrap / unwrap `.dxprofile` archives

Recovery **Export Profile** downloads a CBOR `.dxprofile` with a `SQLITE_DATABASE` entry (`key` = OPFS filename, `value` = raw SQLite bytes). Offline forensics still use raw `.sqlite` files — convert with:

```bash
cd .agents/skills/composer-forensics/scripts && pnpm install

# Raw SQLite → .dxprofile (for re-import via recovery)
node profile-wrap.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite

# .dxprofile → raw SQLite (for probe / automerge tools)
node profile-unwrap.js ./composer-2026-06-07.dxprofile --out-dir /tmp/composer-forensics/unwrapped
```

Options:

| Script              | Flag        | Default | Description                                    |
| ------------------- | ----------- | ------- | ---------------------------------------------- |
| `profile-wrap.js`   | `--name`    | `DXOS`  | OPFS database filename stored in archive `key` |
| `profile-unwrap.js` | `--out-dir` | `.`     | Directory for `<opfs-name>.sqlite` outputs     |

---

## 3. Validate extract (shell)

File-level checks via `sqlite3` CLI:

```bash
bash .agents/skills/composer-forensics/scripts/validate-extract.sh \
  /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

Checks: SQLite magic, `PRAGMA integrity_check`, core table inventory, row counts, top spaces by `objectMeta`.

---

## 4. Probe profile (JavaScript)

Domain-aware summary using local `@dxos` packages (`@dxos/protocols`, `@dxos/keys`).

### Setup (once per clone)

The probe CLI is a workspace package:

```bash
pnpm install
chmod +x .agents/skills/composer-forensics/scripts/probe.js
```

### Default summary

```bash
export PROTO_HOME="$HOME/.proto" PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"

node .agents/skills/composer-forensics/scripts/probe.js \
  /tmp/composer-forensics/main.composer.space/DXOS.sqlite
```

Prints:

- `integrity_check` status
- **Identity** — `identity_key`, `device_key`, `display_name` (from `space_metadata.main` protobuf)
- **Spaces** — count, deleted count, per-space state and feed count
- **Storage counts** — feeds, blocks, objectMeta, automerge, blobs, keyring
- **Top spaces** by object count and feed/block activity
- **Automerge** document totals

Explicit alias:

```bash
node .agents/skills/composer-forensics/scripts/probe.js <db> probe
node .agents/skills/composer-forensics/scripts/probe.js <db> summary
```

---

## 5. Automerge — list documents by size

List document ids sorted by **combined chunk bytes** (largest first):

```bash
cd .agents/skills/composer-forensics/scripts

node automerge-list.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite
# or via probe:
node probe.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite automerge list
```

JSON:

```bash
node automerge-list.js /tmp/.../DXOS.sqlite --json
```

Columns: rank, `document_id`, human-readable bytes, chunk count, `objectMeta` row count, has heads.

---

## 6. Automerge — inspect binary vs JSON size

Compare merged storage bytes vs reified JSON (key metric for load perf debugging):

```bash
node automerge-inspect.js /tmp/.../DXOS.sqlite --largest
node automerge-inspect.js /tmp/.../DXOS.sqlite <document-id> --json
```

Shows:

- **combined binary** — merged snapshot + incremental bytes (`loadIncremental` input)
- **JSON** — compact `JSON.stringify(Automerge.toJS(doc))`
- **binary / JSON ratio** — high ratio + high ops/MiB suggests history bloat
- ops, changes, timings

Also printed by `automerge-bench-load.js` and `automerge-dump-json.js`.

---

## 7. Automerge — bench document load

Time reconstructing a document from stored chunks (matches `StorageSubsystem.loadDoc` chunk order):

```bash
node automerge-bench-load.js /tmp/.../DXOS.sqlite --largest
node automerge-bench-load.js /tmp/.../DXOS.sqlite <document-id>
```

Reports:

1. **Merge + single `loadIncremental`** — what automerge-repo does (`mergeArrays` then `A.loadIncremental(A.init(), merged)`)
2. **Per-chunk** — first chunk `A.load`, rest `A.loadIncremental`, with per-chunk timings

Via probe:

```bash
node probe.js /tmp/.../DXOS.sqlite automerge bench-load --largest
node probe.js /tmp/.../DXOS.sqlite automerge bench-load <document-id>
```

---

## 8. Automerge — escalate to maintainers

When binary/JSON ratio or load time suggests an Automerge issue, produce a shareable bundle:

```bash
node automerge-escalate.js /tmp/.../DXOS.sqlite --largest
node automerge-escalate.js /tmp/.../DXOS.sqlite <document-id> --out-dir /tmp/am-escalation
```

Writes:

- **`<document-id>.bin`** — merged snapshot + incremental bytes (`loadIncremental` input)
- **`<document-id>-report.md`** — load times, size comparison, chunk growth, op breakdown, hypothesis

Use **`--mutations`** on `automerge-inspect.js` for the same analysis without writing files.

Use **`--fast`** on escalate to skip full change decode (smaller report, faster).

Attach `.bin` + `-report.md` when opening an issue with Automerge maintainers. Redact local paths if posting publicly.

---

## 9. End-to-end one-liner

```bash
export PROTO_HOME="$HOME/.proto" PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
ORIGIN=https://main.composer.space
OUT=/tmp/composer-forensics/main.composer.space
OPFS=$(python3 .agents/skills/composer-forensics/scripts/locate-origin.py --origin "$ORIGIN" --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["opfs_pool_dir"])')
python3 .agents/skills/composer-forensics/scripts/extract-opfs-sqlite.py --opfs-dir "$OPFS" --out "$OUT"
bash .agents/skills/composer-forensics/scripts/validate-extract.sh "$OUT/DXOS.sqlite"
node .agents/skills/composer-forensics/scripts/probe.js "$OUT/DXOS.sqlite"
node .agents/skills/composer-forensics/scripts/automerge-list.js "$OUT/DXOS.sqlite"
node .agents/skills/composer-forensics/scripts/automerge-bench-load.js "$OUT/DXOS.sqlite" --largest
```

---

## 10. Manual SQL (ad-hoc)

See [VALIDATION.md](VALIDATION.md) for table reference and query templates.

Quick examples:

```bash
sqlite3 /tmp/composer-forensics/main.composer.space/DXOS.sqlite \
  "SELECT spaceId, typeDXN, COUNT(*) FROM objectMeta GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20;"

sqlite3 /tmp/composer-forensics/main.composer.space/DXOS.sqlite \
  "SELECT document_id FROM automerge_heads ORDER BY document_id;"
```

---

## 12. Composer recovery mode (live browser)

**Doctor workflow:** [DOCTOR.md](DOCTOR.md) — user opens debug port; agent explores via CLI; session report in `/tmp/composer-forensics/reports/`; **confirm before mutating data**.

When the main app will not boot, open **`https://<origin>/recovery.html`** (or `http://localhost:5173/recovery.html` in dev).

| Button         | Action                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Export Profile | Download `.dxprofile` with validated `SQLITE_DATABASE` entry (OPFS `DXOS`) |
| Download Logs  | Export NDJSON from IDB log collector (`composer-logs`)                     |
| Import Profile | Import `.dxprofile` or raw `.sqlite` into OPFS `DXOS` database             |
| Start Client   | Minimal in-process client: no P2P replication, no auto-activate spaces     |
| Boot           | Open main Composer app at `/`                                              |
| Reset          | Wipe all origin storage                                                    |
| Debug Port     | Long-poll local agent on **9321** — open before running CLI                |

On load, **`dxos.*` static globals** are available (same as devtools: `Filter`, `Obj`, `DXN`, …). **`dxos.client`** only after Boot.

### One-shot debug (default)

Browser keeps polling (retries every 2s if server down). Each agent command is a short-lived process:

```bash
# 1. /recovery.html → Open Debug Port
# 2. Run (stdout = JSON result, then exits):
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> 'return dxos.recovery.status()'
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> 'await dxos.recovery.boot(); return await dxos.client.services.host.exportSqliteDatabase()'
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> 'await dxos.recovery.boot(); return await dxos.recovery.compactDocuments()'
```

Environment:

| Variable                            | Default  | Purpose                                        |
| ----------------------------------- | -------- | ---------------------------------------------- |
| `COMPOSER_RECOVERY_PORT`            | `9321`   | Listen port                                    |
| `COMPOSER_RECOVERY_SESSION`         | —        | Session id (alternative to `--session`)        |
| `COMPOSER_RECOVERY_CONNECT_TIMEOUT` | `6000`   | Wait for browser poll (~3× reconnect interval) |
| `COMPOSER_RECOVERY_TIMEOUT`         | `120000` | One-shot wait for eval result (ms)             |
| `COMPOSER_RECOVERY_HTTPS`           | off      | TLS for HTTPS origins                          |

Persistent REPL (optional — multiple commands, one server):

```bash
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> --interactive
```

HTTPS origin (production / Cloudflare Pages):

```bash
cd .agents/skills/composer-forensics/scripts
mkcert -install
mkcert -cert-file .recovery-tls/cert.pem -key-file .recovery-tls/key.pem localhost 127.0.0.1
COMPOSER_RECOVERY_HTTPS=1 node composer-recovery.js --session <uuid> 'return dxos.recovery.status()'
```

Extra commands in `--interactive` mode only (`POST /enqueue` on persistent server).

Then run forensics on the exported file (sections 1–8 above).

---

## 13. Record findings

Append a dated section to [MEMORY.md](MEMORY.md) with origin, OPFS dir id, anomalies, and follow-ups.

For product/engineering issues (e.g. Automerge bloat root cause), use or update [LINEAR-tagindex-write-amplification.md](LINEAR-tagindex-write-amplification.md).

---

## Script index

| Script                                   | Language   | Purpose                                              |
| ---------------------------------------- | ---------- | ---------------------------------------------------- |
| `scripts/locate-origin.py`               | Python     | Map origin → Chrome OPFS path                        |
| `scripts/extract-opfs-sqlite.py`         | Python     | Strip headers → `DXOS.sqlite`                        |
| `scripts/validate-extract.sh`            | Shell      | File-level validation                                |
| `scripts/probe.js`                       | JavaScript | Domain summary + automerge subcommands               |
| `scripts/automerge-list.js`              | JavaScript | Document ids sorted by combined chunk size           |
| `scripts/automerge-inspect.js`           | JavaScript | Binary vs JSON size; `--mutations` for op breakdown  |
| `scripts/automerge-escalate.js`          | JavaScript | Maintainer bundle: `.bin` + `-report.md`             |
| `scripts/automerge-bench-load.js`        | JavaScript | Size comparison + loadIncremental timing             |
| `scripts/automerge-dump-json.js`         | JavaScript | Dump `.bin` + `.json` with size report               |
| `scripts/composer-recovery.js`           | JavaScript | One-shot debug bridge for `/recovery.html`           |
| `LINEAR-tagindex-write-amplification.md` | Doc        | Linear issue draft (TagIndex bloat root cause + fix) |

---

## Troubleshooting

| Issue                               | Fix                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `node:sqlite` not found             | Use Node 24 via `proto` (`export PATH="$HOME/.proto/shims:$PATH"`)        |
| `@dxos/protocols` not found         | Run `pnpm install` from repo root                                         |
| `integrity_check` fails             | Close Chrome; re-extract; hot copies often still query fine               |
| Empty OPFS dir                      | Site data cleared or wrong profile — check `indexeddb_exists` from locate |
| Probe identity empty                | Profile never finished onboarding or metadata key missing                 |
| Debug port won't connect from HTTPS | Mixed content — `COMPOSER_RECOVERY_HTTPS=1` + mkcert; CSP does not fix    |
| Debug port stops immediately        | Re-open Debug Port (old behavior); now retries — reload `/recovery.html`  |
| One-shot times out                  | Open Debug Port first; increase `COMPOSER_RECOVERY_TIMEOUT`               |
