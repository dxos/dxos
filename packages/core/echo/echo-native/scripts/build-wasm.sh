#!/usr/bin/env bash
# Builds the engine for wasm32-wasip1 and copies the module to dist/, where src/native.ts loads it from.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --manifest-path crate/Cargo.toml --release --target wasm32-wasip1 -j "${CARGO_JOBS:-2}"
mkdir -p dist
cp crate/target/wasm32-wasip1/release/echo_native.wasm dist/echo_native.wasm
