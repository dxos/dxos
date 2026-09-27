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

# 2. 1Password CLI (`op`) — the preferred source of credentials (see the `1password` skill).
#    Best-effort: a failed download must not block the toolchain, and it only runs where
#    /usr/local/bin is writable (the cloud container runs as root).
if ! command -v op >/dev/null 2>&1 && [ "$(uname -s)" = Linux ] && [ -w /usr/local/bin ]; then
  log "Installing 1Password CLI"
  (
    set -e
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    case "$(uname -m)" in aarch64 | arm64) arch=arm64 ;; *) arch=amd64 ;; esac
    version="$(curl -fsS https://app-updates.agilebits.com/check/1/0/CLI2/en/2.0.0/N |
      sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p')"
    [ -n "$version" ]
    curl -fsSLo "$tmp/op.zip" "https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_${arch}_v${version}.zip"
    unzip -oq "$tmp/op.zip" op -d "$tmp"
    install -m755 "$tmp/op" /usr/local/bin/op
  ) || log "1Password CLI install failed; continuing without it"
fi

# 3. Depot CLI (`depot`) — reads `Check` logs and retries jobs with DEPOT_TOKEN (see the
#    `depot-ci` skill). Best-effort, same constraints as `op`. The published installer pipes
#    curl into sh, so resolve the release redirect and untar the binary directly.
if ! command -v depot >/dev/null 2>&1 && [ "$(uname -s)" = Linux ] && [ -w /usr/local/bin ]; then
  log "Installing Depot CLI"
  (
    set -e
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    case "$(uname -m)" in aarch64 | arm64) arch=arm64 ;; *) arch=amd64 ;; esac
    rel="$(curl -fsS --no-location --write-out '%{redirect_url}' --output /dev/null \
      "https://dl.depot.dev/cli/download/linux/${arch}/latest")"
    [ -n "$rel" ]
    curl -fsSLo "$tmp/depot.tar.gz" "$rel"
    tar xzf "$tmp/depot.tar.gz" -C "$tmp"
    install -m755 "$tmp/bin/depot" /usr/local/bin/depot
  ) || log "Depot CLI install failed; continuing without it"
fi

# 4. proto — installs everything pinned in .prototools (auto-install is enabled).
if ! command -v proto >/dev/null 2>&1; then
  log "Installing proto"
  curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --yes >/dev/null
fi
log "proto install"
proto install

# 5. moon workspace setup.
log "moon setup"
moon setup

# 6. Workspace deps (non-interactive; skip husky hooks).
log "pnpm install"
CI=true HUSKY=0 pnpm install --prefer-offline

log "Environment ready."
