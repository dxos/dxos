#!/usr/bin/env bash
# Install the moon remote-cache client certificate into this checkout.
#
#   ./install-certs.sh <source-dir>
#
# <source-dir> must contain ca.pem, client.pem and client.key — see README.md for where to get
# them. Never copy ca.key here: it signs new clients and belongs only on the operator's machine.
set -euo pipefail

SRC="${1:?usage: install-certs.sh <source-dir>}"
ROOT=$(git rev-parse --show-toplevel)
DEST="$ROOT/.moon/certs"

for file in ca.pem client.pem client.key; do
  [ -f "$SRC/$file" ] || { echo "missing $SRC/$file"; exit 1; }
done

mkdir -p "$DEST"
cp "$SRC/ca.pem" "$SRC/client.pem" "$SRC/client.key" "$DEST/"
chmod 600 "$DEST/client.key"

echo "installed into $DEST"
openssl x509 -in "$DEST/client.pem" -noout -subject -enddate

# A certificate that parses is not the same as a cache that answers; check reachability too.
host=$(sed -n "s/.*host: 'grpcs:\/\/\([^']*\)'.*/\1/p" "$ROOT/.moon/workspace.yml" | head -1)
echo "configured host: ${host:-<none found>}"
