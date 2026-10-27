#!/usr/bin/env bash
# System packages, Node, pnpm and Playwright's native dependencies for the GitHub Actions container
# (`Dockerfile`).
# Runs as root.
#
# Node and pnpm only bootstrap CI: the setup action runs `pnpm install` before any moon task, so these
# serve until moon's toolchain exists, and everything after uses the `.prototools` versions; keep them
# in sync with it. bun is deliberately absent: moon installs it, and a copy here would shadow the pin.
# PLAYWRIGHT_VERSION follows the `playwright` entry in pnpm-workspace.yaml's catalog.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.11.1}"
PNPM_VERSION="${PNPM_VERSION:-10.28.0}"
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.63.0}"

packages=(
  build-essential ca-certificates curl git-lfs gpg jq libenchant-2-2 libpng++-dev libxtst-dev python3 sudo
  unzip xz-utils
  # OS sandbox for plugin-sandbox's local backend (bubblewrap, its proxy bridge, glob expansion).
  bubblewrap ripgrep socat
  # bindgen for the code-index Rust addon (`tools/code-index-native`).
  libclang-dev
)
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"

case "$(uname -m)" in
  x86_64) arch=x64 ;;
  aarch64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac
curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${arch}.tar.xz" -o /tmp/node.tar.xz
mkdir -p /opt/nodejs
tar -xf /tmp/node.tar.xz -C /opt/nodejs --strip-components=1
rm /tmp/node.tar.xz
ln -sf /opt/nodejs/bin/* /usr/local/bin/

npm install -g --prefix /usr/local "pnpm@${PNPM_VERSION}"
# https://playwright.dev/docs/docker#build-your-own-image
npx -y "playwright@${PLAYWRIGHT_VERSION}" install-deps
