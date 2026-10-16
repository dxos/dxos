#!/usr/bin/env bash
# Fails when the committed plugin is not what the sources build.
set -euo pipefail
cd "$(dirname "$0")/.."
built=$(mktemp)
trap 'rm -f "$built"' EXIT
bash scripts/build.sh "$built"
if ! cmp -s "$built" dependency-closure.wasm; then
  echo "dependency-closure.wasm is stale: run \`moon run moon-dependency-closure:cargo-build\` and commit it." >&2
  # What differs, so a mismatch that is not staleness (a host-dependent build) can be told apart.
  rustc -vV >&2
  for file in dependency-closure.wasm "$built"; do
    echo "$(wc -c < "$file") bytes, sha256 $(sha256sum "$file" 2>/dev/null || shasum -a 256 "$file")" >&2
  done
  echo "$(cmp -l dependency-closure.wasm "$built" | wc -l) bytes differ; strings only in the committed (<) or built (>) copy:" >&2
  diff <(strings -n 10 dependency-closure.wasm) <(strings -n 10 "$built") | grep '^[<>]' | head -40 >&2 || true
  exit 1
fi
