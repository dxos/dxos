#!/usr/bin/env bash
# Environment bootstrap for Claude Code cloud agents working in this repo.
# Installs the toolchain pinned in .prototools (node, pnpm, moon, …) and workspace deps.
#
# To wire this up, set your Claude Code cloud agent environment's setup/install command to:
#   if [ -f .config/claude-code-setup.sh ]; then bash .config/claude-code-setup.sh; fi
# It runs from the repo root, executes this script (propagating its exit code so real
# failures surface), and no-ops where the file is absent — one line works across all repos.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PROTO_HOME="${PROTO_HOME:-$HOME/.proto}"
export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"

log() { printf '\033[1;34m[setup]\033[0m %s\n' "$*"; }

# 1. Claude Code plugin (/dxos:project). Enabling it in .claude/settings.json does not install
#    it, and a container's ~/.claude starts empty. First, not last: it needs nothing below, and
#    under `set -e` a toolchain failure would otherwise take the plugin down with it.
log "claude plugin bootstrap"
bash .claude/scripts/bootstrap-plugins.sh

# 2. 1Password CLI. Not in the sandbox base image, and `op://` references (the age identity in
#    `tools/fixtures`, `pnpm 1p-credentials`) are unresolvable without it. The container carries
#    OP_SERVICE_ACCOUNT_TOKEN, so the binary alone is enough to authenticate headlessly — there is
#    no desktop app to unlock against. Non-fatal: a build must not depend on secret access.
OP_VERSION=2.31.1
if ! command -v op >/dev/null 2>&1; then
  log "Installing 1Password CLI v$OP_VERSION"
  install_op() {
    local tmp arch
    case "$(uname -m)" in
      x86_64) arch=amd64 ;;
      aarch64 | arm64) arch=arm64 ;;
      *) log "op: unsupported architecture $(uname -m)"; return 1 ;;
    esac
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' RETURN
    curl -fsSL -o "$tmp/op.zip" \
      "https://cache.agilebits.com/dist/1P/op2/pkg/v$OP_VERSION/op_linux_${arch}_v$OP_VERSION.zip" || return 1
    unzip -oq "$tmp/op.zip" -d "$tmp" || return 1
    mkdir -p "$HOME/.local/bin"
    install -m 0755 "$tmp/op" "$HOME/.local/bin/op" || return 1
    # The pinned version is the only integrity check available here (1Password publishes no
    # checksum alongside the zip), so assert it rather than trusting the URL.
    [ "$("$HOME/.local/bin/op" --version)" = "$OP_VERSION" ] || { log "op: version mismatch"; return 1; }
  }
  install_op || log "op install failed — \`op://\` references will not resolve (continuing)"
fi

# 3. proto — installs everything pinned in .prototools (auto-install is enabled).
if ! command -v proto >/dev/null 2>&1; then
  log "Installing proto"
  curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --yes >/dev/null
fi
log "proto install"
proto install

# 4. moon workspace setup.
log "moon setup"
moon setup

# 5. Workspace deps (non-interactive; skip husky hooks).
log "pnpm install"
CI=true HUSKY=0 pnpm install --prefer-offline

log "Environment ready."
