#!/usr/bin/env bash
# Makes a fresh container able to run the whole deus-lang suite (task 6cffbc44): the Rust toolchain
# pinned in deus-kernel/rust-toolchain.toml with its wasm targets, and this package's node_modules
# (tsc for the bindings test). `src/preflight.test.ts` names whatever is still missing.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
kernel="$here/../deus-kernel"

if command -v rustup >/dev/null 2>&1; then
  # Without arguments, rustup installs the toolchain and targets the toolchain file names.
  (cd "$kernel" && rustup toolchain install)
  # `deus explore --console` and `deus bindings` run cargo from this package, where rustup picks the
  # default toolchain, which may lack the wasm target; building here uses the pinned one.
  (cd "$kernel" && cargo build --release --quiet --lib --target wasm32-unknown-unknown)
else
  echo "rustup is missing: install it from https://rustup.rs, then rerun this script" >&2
fi

if [ ! -x "$here/node_modules/.bin/tsc" ]; then
  (cd "$here/../../.." && pnpm install --filter "@dxos/deus-lang..." --frozen-lockfile)
fi
