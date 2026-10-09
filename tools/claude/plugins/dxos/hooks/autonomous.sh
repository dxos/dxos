#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Runs the repo's AUTONOMOUS MODE hooks in sessions that do not load its
# `.claude/settings.json` — a multi-repo session rooted at the parent of the
# dxos clone, for one. This plugin is installed at user scope, so its hooks fire
# in every session, while the project's own hooks fire only when the project dir
# is a dxos checkout.
#
#   autonomous.sh prompt   -> .claude/hooks/autonomous.sh       (UserPromptSubmit)
#   autonomous.sh stop     -> .claude/hooks/autonomous-stop.sh  (Stop)
#
# Run state is per session and lives outside any checkout, so which clone's
# scripts handle the event does not matter; the first one found is used.

set -euo pipefail

case "${1:-}" in
  prompt) hook=autonomous.sh ;;
  stop) hook=autonomous-stop.sh ;;
  *) printf 'usage: autonomous.sh {prompt|stop}\n' >&2; exit 2 ;;
esac

input=$(cat)
project="${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || printf '')}"
[ -n "$project" ] || exit 0

# The project's settings already run the hook; running it twice would log every
# message twice and double the Stop-block count.
[ ! -f "$project/.claude/hooks/$hook" ] || exit 0

for candidate in "$project"/*/.claude/hooks/"$hook"; do
  if [ -f "$candidate" ]; then
    printf '%s' "$input" | bash "$candidate"
    exit
  fi
done
