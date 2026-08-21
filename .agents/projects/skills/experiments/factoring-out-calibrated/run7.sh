#!/usr/bin/env bash
# Calibration sweep: find the cast density where the control still fails but the
# CLAUDE.md bullet partially rescues, i.e. a rate strictly between 0 and 1.
# $1=density $2=arm $3=rep
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
D=$1 ARM=$2 REP=$3
DIR="$WS/runs/d${D}__${ARM}__${REP}"
[ -f "$DIR/.done" ] && exit 0
rm -rf "$DIR"; cp -r "$WS/fixture-d${D}" "$DIR"
cp "$WS/arms/claude-base.md" "$DIR/CLAUDE.md"
[ "$ARM" = "A" ] && cat "$WS/arms/rule-line.md" >> "$DIR/CLAUDE.md"
( cd "$DIR" && git add -A && git commit -qm setup )
cd "$DIR" || exit 1
timeout 600 claude -p "$(cat "$WS/arms/task.txt")" --model sonnet \
  --allowedTools Read Edit Write Bash Glob Grep < /dev/null > "$DIR/.out.txt" 2>/dev/null
touch "$DIR/.done"; echo "d$D $ARM $REP done"
