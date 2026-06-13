#!/usr/bin/env bash
# Nightly tooling project review for DXOS.
# Called by the SessionStart hook once per calendar day.

set -euo pipefail

export PROTO_HOME="$HOME/.proto"
export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:/opt/node22/bin:$PATH"

REPO="/home/user/dxos"
STAMP="$HOME/.claude/tooling-review-last-run"
LOG="$HOME/.claude/nightly-tooling-review.log"

TODAY=$(date -u '+%Y-%m-%d')

# Only run once per calendar day.
if [[ -f "$STAMP" ]] && [[ "$(cat "$STAMP")" == "$TODAY" ]]; then
  exit 0
fi

echo "$TODAY" > "$STAMP"
echo "=== Tooling Review $TODAY $(date -u '+%H:%M UTC') ===" >> "$LOG"

cd "$REPO"

/opt/node22/bin/claude \
  --dangerously-skip-permissions \
  -p "You are the project manager for the DXOS Tooling project on Linear (https://linear.app/dxos/project/tooling-8f3b5b8d2450). Working in /home/user/dxos git repo.

Your job (run nightly):
1. Scan git log for commits merged in the last 24 hours related to tooling: build, test, lint, format, CI, TypeScript, vitest, vite, moon, esbuild, oxlint, oxfmt, rollup, rolldown, storybook, pnpm, node.
2. Check GitHub PR status for DX-730 (PR #10453) and DX-738 (PR #10515) — are they merged, closed, or still open/stale?
3. Scan for any new PRs or commits related to the tooling backlog items (DX-732, DX-734, DX-938, DX-939, DX-940, DX-941).
4. Update the Linear Tooling project description (id: 072b91c0-82b4-4539-9912-a68f8ec8ec62) to reflect current state — update 'Status as of' date, move completed items to the completed section, update in-progress PR status.
5. If a backlog issue now has a PR, update its Linear status to In Progress.
6. Output a morning report with: what was merged, what is in-progress with PR status, what is in backlog with recommended next action, links to all relevant Linear issues." \
  2>&1 | tee -a "$LOG"

echo "=== Done $(date -u '+%H:%M UTC') ===" >> "$LOG"

# Signal to Claude Code to show the report in the session.
cat "$LOG" | tail -100 | jq -Rs '{"systemMessage": ("📊 DXOS Tooling Morning Report\n" + .)}'
