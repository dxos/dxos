#!/bin/sh
#
# Copyright 2026 DXOS.org
#
# Installs the standalone `dx` binary from the artifacts bucket.
#
#   curl -fsSL <base>/cli/install.sh | sh
#
# DX_VERSION      version to install (default: the one in cli/latest.json).
# DX_INSTALL_DIR  target directory (default: $HOME/.local/bin).
# DX_ARTIFACTS    bucket base URL (default: the agent-artifacts public URL).

set -eu

BASE="${DX_ARTIFACTS:-https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev}"
DIR="${DX_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
  echo "install.sh: $*" >&2
  exit 1
}

case "$(uname -s)" in
  Linux) platform=linux ;;
  Darwin) platform=darwin ;;
  *) fail "unsupported OS $(uname -s); download dx-win32-x64.exe from $BASE/cli/<version>/ instead." ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) fail "unsupported architecture $(uname -m)." ;;
esac

version="${DX_VERSION:-}"
if [ -z "$version" ]; then
  # latest.json is one line written by publish-r2.ts, so a sed match avoids depending on jq.
  version="$(curl -fsSL "$BASE/cli/latest.json" | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p')"
  [ -n "$version" ] || fail "could not read the version from $BASE/cli/latest.json."
fi

name="dx-$platform-$arch"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading dx $version ($platform-$arch)..."
curl -fsSL "$BASE/cli/$version/$name" -o "$tmp/dx"
curl -fsSL "$BASE/cli/$version/SHA256SUMS" -o "$tmp/SHA256SUMS"

expected="$(awk -v name="$name" '$2 == name { print $1 }' "$tmp/SHA256SUMS")"
[ -n "$expected" ] || fail "no checksum for $name in SHA256SUMS."
if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$tmp/dx" | awk '{ print $1 }')"
else
  actual="$(shasum -a 256 "$tmp/dx" | awk '{ print $1 }')"
fi
[ "$expected" = "$actual" ] || fail "checksum mismatch for $name (expected $expected, got $actual)."

mkdir -p "$DIR"
chmod 755 "$tmp/dx"
mv "$tmp/dx" "$DIR/dx"
echo "Installed $DIR/dx"

case ":$PATH:" in
  *":$DIR:"*) ;;
  *) echo "Add $DIR to PATH: export PATH=\"$DIR:\$PATH\"" ;;
esac
