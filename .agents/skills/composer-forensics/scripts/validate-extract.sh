#!/usr/bin/env bash
# Validate an extracted Composer DXOS SQLite database.
set -euo pipefail

DB="${1:?Usage: validate-extract.sh path/to/DXOS.sqlite}"

if [[ ! -f "$DB" ]]; then
  echo "ERROR: file not found: $DB" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "ERROR: sqlite3 not found on PATH" >&2
  exit 1
fi

echo "=== Composer forensics validation ==="
echo "Database: $DB"
echo "Size: $(stat -f%z "$DB" 2>/dev/null || stat -c%s "$DB") bytes"
echo

# Magic
MAGIC=$(xxd -l 16 -p "$DB")
if [[ "$MAGIC" != "53514c69746520666f726d6174203300" ]]; then
  echo "FAIL: missing SQLite magic header"
  exit 1
fi
echo "OK: SQLite magic header"

# Integrity
INTEGRITY=$(sqlite3 "$DB" "PRAGMA integrity_check;")
if [[ "$INTEGRITY" != "ok" ]]; then
  echo "WARN: integrity_check = $INTEGRITY"
else
  echo "OK: integrity_check"
fi

# Journal mode
echo "journal_mode: $(sqlite3 "$DB" "PRAGMA journal_mode;")"

# Tables
TABLE_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo "tables: $TABLE_COUNT"

CORE_TABLES=(
  feeds blocks objectMeta automerge_chunks automerge_heads
  space_metadata blobs_meta blobs_data keyring
)
MISSING=()
for table in "${CORE_TABLES[@]}"; do
  EXISTS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$table';")
  if [[ "$EXISTS" == "0" ]]; then
    MISSING+=("$table")
  fi
done

if ((${#MISSING[@]} > 0)); then
  echo "WARN: missing core tables: ${MISSING[*]}"
else
  echo "OK: core tables present"
fi

echo
echo "=== Row counts ==="
sqlite3 -header -column "$DB" "
SELECT 'feeds' AS tbl, COUNT(*) AS n FROM feeds
UNION ALL SELECT 'blocks', COUNT(*) FROM blocks
UNION ALL SELECT 'objectMeta', COUNT(*) FROM objectMeta
UNION ALL SELECT 'objectMeta_deleted', COUNT(*) FROM objectMeta WHERE deleted != 0
UNION ALL SELECT 'automerge_chunks', COUNT(*) FROM automerge_chunks
UNION ALL SELECT 'space_metadata', COUNT(*) FROM space_metadata
UNION ALL SELECT 'blobs_meta', COUNT(*) FROM blobs_meta;
" 2>/dev/null || echo "(some count queries failed — schema may differ)"

echo
echo "=== Spaces (top 10 by object count) ==="
sqlite3 -header -column "$DB" "
SELECT spaceId, COUNT(*) AS objects
FROM objectMeta
GROUP BY spaceId
ORDER BY objects DESC
LIMIT 10;
" 2>/dev/null || true

echo
echo "Validation complete."
