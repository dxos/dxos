# Composer SQLite validation

Database name in OPFS: **`DXOS`**. Schema is created by ECHO pipeline migrations across packages (`feed-store`, `entity-meta-index`, `automerge`, `sqlite-metadata-store`, `sqlite-blob-store`, `sqlite-keyring`, etc.).

## Expected tables (v1 checklist)

Core tables that should exist in a mature profile:

| Table | Package / role |
|-------|----------------|
| `feeds` | Feed store |
| `blocks` | Feed blocks |
| `cursor_tokens` | Queue cursors |
| `subscriptions` | Feed subscriptions |
| `sync_state` | Feed sync |
| `automerge_chunks` | Automerge doc storage |
| `automerge_heads` | Automerge heads |
| `objectMeta` | Entity index |
| `reverseRef` | Reverse refs |
| `ftsIndex` (+ `_config`, `_content`, `_data`, `_docsize`, `_idx`) | Full-text index |
| `indexCursor` | Index tracker |
| `space_metadata` | Space metadata |
| `space_large` | Large space payloads |
| `blobs_meta` | Blob metadata |
| `blobs_data` | Blob bytes |
| `hypercore_files` | Client services storage |
| `keyring` | Halo keys (**sensitive**) |
| `delete` | Tombstones / delete queue |

Table set varies by Composer version and migrations. Treat missing tables as a **version signal**, not always corruption.

## Automated validation

```bash
bash .agents/skills/composer-forensics/scripts/validate-extract.sh path/to/DXOS.sqlite
```

## Manual queries

### Inventory

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
PRAGMA journal_mode;
PRAGMA page_count;
PRAGMA page_size;
```

### Integrity

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

### Space overview

```sql
SELECT spaceId, length(value) AS meta_len
FROM space_metadata
ORDER BY meta_len DESC
LIMIT 20;
```

### Object counts by space and type

```sql
SELECT spaceId, typeDXN, deleted, COUNT(*) AS n
FROM objectMeta
GROUP BY spaceId, typeDXN, deleted
ORDER BY n DESC
LIMIT 50;
```

### Feed activity

```sql
SELECT f.spaceId, f.feedId, COUNT(b.insertionId) AS block_count
FROM feeds f
LEFT JOIN blocks b ON b.feedPrivateId = f.feedPrivateId
GROUP BY f.spaceId, f.feedId
ORDER BY block_count DESC
LIMIT 20;
```

### Automerge volume

```sql
SELECT COUNT(*) AS chunks, SUM(LENGTH(data)) AS bytes FROM automerge_chunks;
SELECT COUNT(*) AS heads FROM automerge_heads;
```

### Blobs

```sql
SELECT COUNT(*) FROM blobs_meta;
SELECT SUM(LENGTH(data)) FROM blobs_data;
```

## Forensics report template

```markdown
## Composer forensics — <origin> — <date>

### Source
- Chrome profile: …
- OPFS dir: File System/<ID>/t/00/
- Extract path: …

### File validation
- integrity_check: …
- Tables: N found (M expected core)
- DB size: … MB

### Domain summary
- Spaces: …
- objectMeta rows: … (deleted: …)
- blocks: …
- automerge_chunks: …

### Anomalies
- …

### Next steps
- …
```
