#!/usr/bin/env bash
# Fails when the committed plugin is not what the sources build.
set -euo pipefail
cd "$(dirname "$0")/.."
built=$(mktemp)
trap 'rm -f "$built"' EXIT
bash scripts/build.sh "$built"
if ! cmp -s "$built" dependency-closure.wasm; then
  echo "dependency-closure.wasm is stale: run \`moon run moon-dependency-closure:cargo-build\` and commit it." >&2
  exit 1
fi
