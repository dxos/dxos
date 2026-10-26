#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Step 02: import the pool mbox from step 01 into the test account with GYB (Got Your Back), then
# check that every message landed under the pool label and none of them in the inbox.
#
# Run it BEFORE step 03 creates the canary space: the sync fetches the history delta's new mail by
# id with no date check, so an import into a space that already syncs pulls the whole pool in.
#
# Usage: scripts/02-import-pool.sh <directory holding enron-pool.mbox>

set -euo pipefail

ACCOUNT="${GMAIL_ACCOUNT:-test@braneframe.com}"
MBOX_DIR="${1:?usage: 02-import-pool.sh <directory holding the mbox from step 01>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gyb >/dev/null 2>&1; then
  echo "error: gyb is not on PATH; install it first (see README, step 02)." >&2
  exit 1
fi

# GYB signs in as the account itself (route A). `--label-restored` adds the pool label even if a
# GYB release ignores the X-Gmail-Labels header that step 01 writes.
gyb --email "$ACCOUNT" --action restore-mbox --local-folder "$MBOX_DIR" --label-restored enron-pool

node "$HERE/../src/main.ts" pool-status
