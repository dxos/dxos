#!/usr/bin/env bash
# Builds the plugin `.moon/toolchains.yml` loads, to the path given (default: the committed copy).
# Paths are remapped so the committed binary carries no paths from the machine that built it.
set -euo pipefail
cd "$(dirname "$0")/.."
out=${1:-dependency-closure.wasm}
RUSTFLAGS="--remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo --remap-path-prefix=$PWD=/src" \
  cargo build --release --locked --target wasm32-wasip1
cp target/wasm32-wasip1/release/dependency_closure.wasm "$out"
