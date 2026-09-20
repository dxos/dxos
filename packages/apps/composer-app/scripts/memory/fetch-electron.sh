#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Downloads the Electron build and breakpad symbols that `native-heap.mjs` symbolizes
# against. Electron embeds the same Chromium as Chrome for Testing but, unlike it,
# publishes a symbol file per release — which is the only reason the native allocation
# stacks resolve to function names on macOS.
#
# Pin a version whose Chromium is close to the one `ledger.mjs` measures; the point of
# comparison is the same engine, not the same binary.
#
# Usage: scripts/memory/fetch-electron.sh [version] [destination]

set -euo pipefail

VERSION="${1:-v44.4.3}"
DEST="${2:-./tmp/electron}"
ARCH="darwin-arm64"
BASE="https://github.com/electron/electron/releases/download/${VERSION}"

mkdir -p "${DEST}"
cd "${DEST}"

if [[ ! -d Electron.app ]]; then
  echo "downloading electron-${VERSION}-${ARCH}.zip (~124 MB) ..."
  curl -fsSL -o electron.zip "${BASE}/electron-${VERSION}-${ARCH}.zip"
  unzip -q electron.zip
  rm electron.zip
fi

if [[ ! -d breakpad_symbols ]]; then
  echo "downloading electron-${VERSION}-${ARCH}-symbols.zip (~123 MB) ..."
  curl -fsSL -o symbols.zip "${BASE}/electron-${VERSION}-${ARCH}-symbols.zip"
  unzip -q symbols.zip
  rm symbols.zip
fi

SYM="$(find breakpad_symbols -name 'Electron Framework.sym' | head -1)"
if [[ -z "${SYM}" ]]; then
  echo "no 'Electron Framework.sym' under ${DEST}/breakpad_symbols" >&2
  exit 1
fi

# The UUIDs must match or every address resolves to the wrong function, silently.
BIN_UUID="$(dwarfdump --uuid 'Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework' | awk '{print $2}' | tr -d '-')"
SYM_UUID="$(head -1 "${SYM}" | awk '{print $4}')"
if [[ "${SYM_UUID}" != "${BIN_UUID}"* ]]; then
  echo "symbol/binary UUID mismatch: ${SYM_UUID} vs ${BIN_UUID}" >&2
  exit 1
fi

cat <<EOF

ready. from packages/apps/composer-app:

  node scripts/memory/native-heap.mjs http://localhost:4173 \\
    --electron ${DEST}/Electron.app \\
    --symbols '${DEST}/${SYM}'
EOF
