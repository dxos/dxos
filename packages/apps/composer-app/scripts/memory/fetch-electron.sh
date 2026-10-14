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
# Needs ~250 MB of downloads and ~1.5 GB on disk once unpacked: the symbol file alone is
# ~700 MB of text, plus a ~160 MB index `native-heap.mjs` writes beside it on first use.
#
# Usage: scripts/memory/fetch-electron.sh [version] [destination] [arch]

set -euo pipefail

VERSION="${1:-v44.4.3}"
DEST="${2:-./tmp/electron}"
ARCH="${3:-darwin-$(uname -m | sed 's/^x86_64$/x64/;s/^aarch64$/arm64/')}"
BASE="https://github.com/electron/electron/releases/download/${VERSION}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "native-heap.mjs reads Mach-O UUIDs and macOS memory dumps; this is macOS-only" >&2
  exit 1
fi
if ! command -v dwarfdump >/dev/null; then
  echo "dwarfdump not found — install the Xcode command line tools (xcode-select --install)" >&2
  exit 1
fi

mkdir -p "${DEST}"
cd "${DEST}"

# Staging directories are scratch, so an interrupted or failed run leaves none behind.
trap 'rm -rf ./.stage.*' EXIT

# Unpacked into a staging directory and moved into place, so an interrupted download or
# unzip cannot leave a half-populated directory that every later run then skips.
fetch() {
  local artifact="$1" marker="$2" stamp="$2.version" stage
  # The stamp carries the version, so asking for a different one re-downloads instead of
  # silently reusing whatever is on disk and then UUID-checking it against itself.
  if [[ -e "${marker}" && "$(cat "${stamp}" 2>/dev/null || true)" == "${VERSION} ${ARCH}" ]]; then
    return
  fi
  rm -rf "${marker}" "${stamp}"
  stage="$(mktemp -d "./.stage.XXXXXX")"
  echo "downloading ${artifact} ..."
  curl -fL --retry 3 -o "${stage}/archive.zip" "${BASE}/${artifact}"
  unzip -q -o "${stage}/archive.zip" -d "${stage}/out"
  if [[ ! -e "${stage}/out/${marker}" ]]; then
    echo "${artifact} does not contain ${marker}: $(ls "${stage}/out")" >&2
    exit 1
  fi
  mv "${stage}/out/${marker}" "./${marker}"
  rm -rf "${stage}"
  echo "${VERSION} ${ARCH}" > "${stamp}"
}

fetch "electron-${VERSION}-${ARCH}.zip" Electron.app
fetch "electron-${VERSION}-${ARCH}-symbols.zip" breakpad_symbols

# `-print -quit` rather than a pipe to `head`: under `pipefail` the closed pipe makes
# `find` exit 141 and `set -e` aborts before the check below can report anything.
SYM="$(find breakpad_symbols -name 'Electron Framework.sym' -print -quit)"
if [[ -z "${SYM}" ]]; then
  echo "no 'Electron Framework.sym' under ${DEST}/breakpad_symbols" >&2
  exit 1
fi

# The UUIDs must match or every address resolves to the wrong function, silently. dwarfdump
# prints one line per architecture, so pick the slice rather than every field.
FRAMEWORK='Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'
# dwarfdump names the slice the way the linker does, not the way Electron names its
# release asset: x64 there is x86_64 here.
SLICE="${ARCH##*-}"
if [[ "${SLICE}" == "x64" ]]; then
  SLICE="x86_64"
fi
BIN_UUID="$(dwarfdump --uuid "${FRAMEWORK}" | awk -v arch="(${SLICE})" '$3 == arch { print $2 }' | tr -d '-')"
SYM_UUID="$(head -1 "${SYM}" | awk '{print $4}')"
if [[ -z "${BIN_UUID}" || "${SYM_UUID}" != "${BIN_UUID}"* ]]; then
  echo "symbol/binary UUID mismatch for ${SLICE}: '${SYM_UUID}' vs '${BIN_UUID}'" >&2
  exit 1
fi

cat <<EOF

ready. from packages/apps/composer-app:

  node scripts/memory/native-heap.mjs http://localhost:4173 \\
    --electron ${DEST}/Electron.app \\
    --symbols '${DEST}/${SYM}'
EOF
