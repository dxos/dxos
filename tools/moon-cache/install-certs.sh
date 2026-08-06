#!/usr/bin/env bash
# Install the moon remote-cache client certificate into this checkout.
#
#   ./install-certs.sh <source-dir>
#
# <source-dir> must contain ca.pem, client.pem and client.key — see README.md for where to get
# them. Never copy ca.key here: it signs new clients and belongs only on the operator's machine.
set -euo pipefail

SRC="${1:?usage: install-certs.sh <source-dir> | --op [vault]}"
ROOT=$(git rev-parse --show-toplevel)
DEST="$ROOT/.moon/certs"

mkdir -p "$DEST"

if [ "$SRC" = "--op" ]; then
  vault="${2:-CI}"
  command -v op >/dev/null || { echo "1Password CLI (op) not installed: brew install 1password-cli"; exit 1; }
  # One item, one field per file. ca.key is deliberately not fetched: it signs new clients and
  # belongs only on an operator's machine.
  for file in ca.pem client.pem client.key; do
    op read "op://$vault/moon-cache-certs/$file" --out-file "$DEST/$file" --force
  done
else
  for file in ca.pem client.pem client.key; do
    [ -f "$SRC/$file" ] || { echo "missing $SRC/$file"; exit 1; }
  done
  cp "$SRC/ca.pem" "$SRC/client.pem" "$SRC/client.key" "$DEST/"
fi

chmod 600 "$DEST/client.key"

echo "installed into $DEST"
openssl x509 -in "$DEST/client.pem" -noout -subject -enddate

# A certificate that parses is not the same as a cache that answers; check reachability too.
# Skip comment lines — the rollback-to-Depot block is a commented `host:` that would match first.
host=$(grep -v '^[[:space:]]*#' "$ROOT/.moon/workspace.yml" | sed -n "s/.*host: 'grpcs:\/\/\([^']*\)'.*/\1/p" | head -1)
echo "configured host: ${host:-<none found>}"
