#!/usr/bin/env bash
# One run: $1=task $2=arm $3=rep. Writes runs/<task>__<arm>__<rep>.md
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
TASK=$1 ARM=$2 REP=$3
OUT="$WS/runs/${TASK}__${ARM}__${REP}.md"
[ -s "$OUT" ] && exit 0

CLASS=$(head -1 "$WS/tasks/$TASK.txt" | sed 's/^CLASS=//')
BODY=$(tail -n +2 "$WS/tasks/$TASK.txt")
OURS=$(cat "$WS/arms/ours-$CLASS.txt")
THEIRS=$(cat "$WS/arms/theirs-$CLASS.txt")
DILUTION=$(cat "$WS/arms/dilution.txt")

case "$ARM" in
  E) SYS="$DILUTION";              USER="$BODY" ;;                       # control: no rule
  A) SYS="$OURS"$'\n\n'"$DILUTION"; USER="$BODY" ;;                      # ours, always-loaded then diluted
  B) SYS="$OURS"$'\n\n'"$DILUTION"; USER="$THEIRS"$'\n\n'"$BODY" ;;      # both
  C) SYS="$DILUTION";              USER="$THEIRS"$'\n\n'"$BODY" ;;       # theirs, on-demand
  D) SYS="$DILUTION";              USER="$BODY"$'\n\n'"$OURS" ;;         # ours, re-injected last
esac

timeout 300 claude -p "$USER" \
  --append-system-prompt "$SYS" \
  --model sonnet \
  --disallowedTools Write Edit Read Bash Glob Grep Task WebFetch WebSearch \
  < /dev/null \
  > "$OUT" 2>"$OUT.err"
echo "$TASK $ARM $REP -> $(wc -c < "$OUT") bytes"
