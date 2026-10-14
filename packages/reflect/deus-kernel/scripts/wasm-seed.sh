#!/usr/bin/env bash
# The wasm32-wasip1 kernel, run by Node's WASI, must self-compile the seed byte for byte.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --release --target wasm32-wasip1 --quiet
out="$(mktemp)"
trap 'rm -f "$out"' EXIT
(cd ../deus-lang && node --no-warnings ../deus-kernel/wasi/run.mjs ../deus-kernel/target/wasm32-wasip1/release/deus-kernel.wasm \
  compile deus --main Cli.main -o "$out")
cmp "$out" ../deus-lang/seed/deus.image
echo "wasm kernel: seed reproduced"
