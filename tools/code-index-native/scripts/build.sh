#!/usr/bin/env bash
# Builds the Node-API addon and puts it where `@dxos/code-index` loads it from.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --release --features napi
case "$(uname -s)" in
  Darwin) library=target/release/libcode_index_native.dylib ;;
  *) library=target/release/libcode_index_native.so ;;
esac
cp "$library" code-index-native.node
