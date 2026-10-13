#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PostToolUse hook for Edit/Write/MultiEdit. Skills load only when the agent
# judges a description relevant, and UI work in a react-ui-* package routinely
# misses composer-ui; so on the first React edit of a session this injects the
# skill's "Non-negotiables" list, read from the skill itself so it has one source.
#
# Fires once per session (marker keyed by session_id under $TMPDIR) and only for
# `.tsx` files under packages/{ui,plugins,stories,apps,devtools}. Never blocks.

set -uo pipefail

input=$(cat)

path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
session=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

case "$path" in
  */packages/ui/*.tsx | */packages/plugins/*.tsx | */packages/stories/*.tsx | */packages/apps/*.tsx | */packages/devtools/*.tsx) ;;
  packages/ui/*.tsx | packages/plugins/*.tsx | packages/stories/*.tsx | packages/apps/*.tsx | packages/devtools/*.tsx) ;;
  *) exit 0 ;;
esac

marker_dir="${DXOS_UI_SKILL_MARKERS:-${TMPDIR:-/tmp}/dxos-ui-skill}"
marker="$marker_dir/$session"
[ -e "$marker" ] && exit 0
mkdir -p "$marker_dir" && : > "$marker"

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
skill="$root/.agents/skills/composer-ui/SKILL.md"
[ -f "$skill" ] || exit 0

# The list runs from its heading to the imports line that closes it.
rules=$(awk '/^## Non-negotiables/{on=1} on&&/^Imports are per-primitive subpaths/{exit} on' "$skill")
[ -n "$rules" ] || exit 0

context="You just edited React UI (${path##*/}). Load the \`composer-ui\` skill before further UI edits if you have not, and hold this change to its non-negotiables:

$rules"

jq -nc --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
