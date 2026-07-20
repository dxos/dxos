#!/usr/bin/env bash
# Environment bootstrap for Claude Code cloud agents working in this repo.
# Installs the toolchain pinned in .prototools (node, pnpm, moon, …) and workspace deps.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PROTO_HOME="${PROTO_HOME:-$HOME/.proto}"
export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"

log() { printf '\033[1;34m[setup]\033[0m %s\n' "$*"; }

# 1. proto — installs everything pinned in .prototools (auto-install is enabled).
if ! command -v proto >/dev/null 2>&1; then
  log "Installing proto"
  curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --yes >/dev/null
fi
log "proto install"
proto install

# 2. moon workspace setup.
log "moon setup"
moon setup

# 3. Workspace deps (non-interactive; skip husky hooks).
log "pnpm install"
CI=true HUSKY=0 pnpm install --prefer-offline

log "Environment ready."
