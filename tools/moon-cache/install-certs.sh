#!/usr/bin/env bash
# Install the moon remote-cache client certificate for this machine.
#
#   ./install-certs.sh --op [vault]     from 1Password (default vault: CI)
#   ./install-certs.sh <source-dir>     from a directory holding ca.pem, client.pem, client.key
#   ./install-certs.sh --worktree ...   into ./.moon/certs instead (see below)
#
# Certificates land in ~/.config/moon-cache and are read through the MOON_REMOTE_MTLS_*
# environment variables, which take absolute paths. `.moon/workspace.yml` points at
# `.moon/certs/…` relative to the workspace root, so storing them in the repo would mean
# repeating this in every worktree — and a machine can easily have twenty.
#
# --worktree keeps the in-repo layout, which is what CI uses: `.github/actions/setup` writes the
# same three files from secrets, and a runner has exactly one checkout.
#
# Never copy ca.key here. It signs new clients and belongs only on an operator's machine.
set -euo pipefail

CERT_HOME="${XDG_CONFIG_HOME:-$HOME/.config}/moon-cache"
WORKTREE=false
if [ "${1:-}" = "--worktree" ]; then
  WORKTREE=true
  shift
  CERT_HOME="$(git rev-parse --show-toplevel)/.moon/certs"
fi

SRC="${1:?usage: install-certs.sh [--worktree] (--op [vault] | <source-dir>)}"
mkdir -p "$CERT_HOME"

if [ "$SRC" = "--op" ]; then
  vault="${2:-CI}"
  command -v op >/dev/null || { echo "1Password CLI (op) not installed: brew install 1password-cli"; exit 1; }
  # One item, one field per file.
  for file in ca.pem client.pem client.key; do
    op read "op://$vault/moon-cache-certs/$file" --out-file "$CERT_HOME/$file" --force > /dev/null
  done
else
  for file in ca.pem client.pem client.key; do
    [ -f "$SRC/$file" ] || { echo "missing $SRC/$file"; exit 1; }
  done
  cp "$SRC/ca.pem" "$SRC/client.pem" "$SRC/client.key" "$CERT_HOME/"
fi
chmod 600 "$CERT_HOME/client.key"

# Certificates that parse are not the same as a cache that answers, and moon reports an
# unreachable cache as one warning and a green build — so check here, where it is noticeable.
# `grpcs*` rather than `grpcs\?`: BSD sed treats \? literally.
ROOT=$(git rev-parse --show-toplevel)
host=$(grep -v '^[[:space:]]*#' "$ROOT/.moon/workspace.yml" | sed -n "s|.*host: 'grpcs*://\([^':]*\).*|\1|p" | head -1)
if [ -z "$host" ]; then
  echo "could not read remote.host from .moon/workspace.yml"
  exit 1
fi

# 9093 is the HTTP listener of the same process that serves gRPC on 9092.
if ! curl -sf --max-time 20 --cacert "$CERT_HOME/ca.pem" "https://$host:9093/status" > /dev/null; then
  echo "FAIL: $host is unreachable, or its certificate does not verify."
  exit 1
fi
# /status is unauthenticated; a CAS path is not. 404 is authorised-and-absent, 401 is rejected.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  --cacert "$CERT_HOME/ca.pem" --cert "$CERT_HOME/client.pem" --key "$CERT_HOME/client.key" \
  "https://$host:9093/cas/0000000000000000000000000000000000000000000000000000000000000000")
if [ "$code" != "404" ]; then
  echo "FAIL: $host rejected the client certificate (HTTP $code, expected 404)."
  exit 1
fi

echo "installed into $CERT_HOME"
openssl x509 -in "$CERT_HOME/client.pem" -noout -enddate
echo "$host reachable and authenticated."

if [ "$WORKTREE" = true ]; then
  exit 0
fi

# Written as a file to source rather than three exports to paste, so rotating the location later
# does not need every developer to edit their profile again.
cat > "$CERT_HOME/env.sh" <<EOF
# moon remote cache — see tools/moon-cache/README.md
export MOON_REMOTE_MTLS_CA_CERT="$CERT_HOME/ca.pem"
export MOON_REMOTE_MTLS_CLIENT_CERT="$CERT_HOME/client.pem"
export MOON_REMOTE_MTLS_CLIENT_KEY="$CERT_HOME/client.key"
EOF

if [ -n "${MOON_REMOTE_MTLS_CA_CERT:-}" ]; then
  echo "Shell already configured."
else
  echo
  echo "Add this to your shell profile (~/.zshrc), once per machine — every checkout then uses the cache:"
  echo
  echo "  [ -f $CERT_HOME/env.sh ] && source $CERT_HOME/env.sh"
fi
