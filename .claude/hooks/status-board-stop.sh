#!/usr/bin/env bash
# Stop hook: rebuilds the session's status board and, when it changed, blocks the stop once so the agent publishes it
# (status-board skill). With no board registered it exits before starting node, so it costs nothing.
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -f "$ROOT/.claude/.status-board/current" ] || exit 0
exec node "$ROOT/tools/session-board/src/cli.ts" hook
