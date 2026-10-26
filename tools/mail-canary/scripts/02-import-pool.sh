#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Step 02: import the pool mbox from step 01 into the test account through the Gmail API, then check
# that every message landed under the pool label, none of them in the inbox, and none newer than the
# sync window. The import is resumable: rerun the same command after an interruption.
#
# Run it BEFORE step 03 creates the canary space: the sync fetches the history delta's new mail by
# id with no date check, so an import into a space that already syncs pulls the whole pool in.
#
# Usage: scripts/02-import-pool.sh <path to enron-pool.mbox>
#
# Needs the canary's Gmail grant in .secrets/mail-canary-gmail.env (`node src/main.ts auth`) or in
# GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN.

set -euo pipefail

MBOX="${1:?usage: 02-import-pool.sh <path to the mbox from step 01>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
ENV_FILE="$ROOT/.secrets/mail-canary-gmail.env"

node --env-file-if-exists="$ENV_FILE" "$HERE/../src/main.ts" import-pool "$MBOX"
node --env-file-if-exists="$ENV_FILE" "$HERE/../src/main.ts" pool-status
