#!/usr/bin/env bash
# Install the repo's own Claude Code plugin (`dxos@dxos`, source tools/claude/plugins/dxos).
#
# `.claude/settings.json` only *declares* the marketplace and enables the plugin; nothing
# fetches or installs it, so a fresh machine — and every cloud sandbox container, whose
# ~/.claude starts empty — answers `Unknown command` to /dxos:project until this runs.
#
# Idempotent and safe to run repeatedly. Wired from two places, because either alone leaves a
# gap: `.config/claude-code-setup.sh` (baked into the cached container image, so the FIRST
# session has the plugin) and a SessionStart hook (covers environments whose setup command is
# not wired — there the plugin lands from the next session on, since plugins resolve before
# hooks fire).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLUGINS_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins"

# Already installed — the common path, kept to a single grep so the hook costs nothing.
if grep -q '"dxos@dxos"' "${PLUGINS_DIR}/installed_plugins.json" 2>/dev/null; then
  exit 0
fi

command -v claude >/dev/null 2>&1 || exit 0

# Register from the local checkout rather than the GitHub source: it needs no network and pins the
# plugin to the tree the session is actually working in. Keyed on the SOURCE, not the name — a
# `dxos` marketplace already exists from `extraKnownMarketplaces` in `.claude/settings.json`, so a
# name-only check skipped this every time and the plugin silently tracked GitHub `main` instead.
if ! grep -q "\"installLocation\": *\"${REPO_ROOT}\"" "${PLUGINS_DIR}/known_marketplaces.json" 2>/dev/null; then
  claude plugin marketplace add "$REPO_ROOT" >/dev/null 2>&1
fi

claude plugin install dxos@dxos >/dev/null 2>&1 ||
  echo "[bootstrap-plugins] could not install dxos@dxos; /dxos:project will be unavailable" >&2

exit 0
