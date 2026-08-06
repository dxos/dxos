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
# Certificates that parse are not the same as a cache that answers, and moon reports an
# unreachable cache as one warning and a green build — so check here, where it is noticeable.
# `grpcs*` rather than `grpcs\?`: BSD sed treats \? literally.
host=$(grep -v '^[[:space:]]*#' "$ROOT/.moon/workspace.yml" | sed -n "s|.*host: 'grpcs*://\([^':]*\).*|\1|p" | head -1)
if [ -z "$host" ]; then
  echo "could not read remote.host from .moon/workspace.yml"
  exit 1
fi

# 9093 is the HTTP listener of the same process that serves gRPC on 9092.
if ! curl -sf --max-time 20 --cacert "$DEST/ca.pem" "https://$host:9093/status" > /dev/null; then
  echo "FAIL: $host is unreachable, or its certificate does not verify."
  exit 1
fi
# /status is unauthenticated; a CAS path is not. 404 is authorised-and-absent, 401 is rejected.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  --cacert "$DEST/ca.pem" --cert "$DEST/client.pem" --key "$DEST/client.key" \
  "https://$host:9093/cas/0000000000000000000000000000000000000000000000000000000000000000")
if [ "$code" != "404" ]; then
  echo "FAIL: $host rejected the client certificate (HTTP $code, expected 404)."
  exit 1
fi

echo "$host reachable and authenticated."
