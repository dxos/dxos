#!/usr/bin/env bash
# Two-turn run: filler turn puts distance between the system-prompt rule and the
# tempting task, reproducing the condition run 1 missed.
# $1=task $2=arm $3=rep
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
FILLER=$(cat "$WS/tasks/_filler.txt")

case "$ARM" in
  E) SYS="$DILUTION";               T1="$FILLER";                    T2="$BODY" ;;
  A) SYS="$OURS"$'\n\n'"$DILUTION"; T1="$FILLER";                    T2="$BODY" ;;
  C) SYS="$DILUTION";               T1="$FILLER";                    T2="$THEIRS"$'\n\n'"$BODY" ;;
  D) SYS="$DILUTION";               T1="$FILLER"$'\n\n'"$OURS";      T2="$BODY"$'\n\n'"$OURS" ;;
esac

SID=$(python3 -c 'import uuid;print(uuid.uuid4())')
COMMON=(--model sonnet --session-id "$SID" --append-system-prompt "$SYS"
        --disallowedTools Write Edit Read Bash Glob Grep Task WebFetch WebSearch)

# Turn 1 (filler) - output discarded, its purpose is distance.
timeout 300 claude -p "$T1" "${COMMON[@]}" < /dev/null > "$WS/runs/${TASK}__${ARM}__${REP}.turn1" 2>/dev/null
[ -s "$WS/runs/${TASK}__${ARM}__${REP}.turn1" ] || { echo "$TASK $ARM $REP TURN1-FAILED"; exit 1; }

# Turn 2 (the tempting task) - this is what gets scored.
timeout 300 claude -p --resume "$SID" "$T2" --model sonnet \
  --disallowedTools Write Edit Read Bash Glob Grep Task WebFetch WebSearch \
  < /dev/null > "$OUT" 2>/dev/null
echo "$TASK $ARM $REP -> t1=$(wc -c < "$WS/runs/${TASK}__${ARM}__${REP}.turn1") t2=$(wc -c < "$OUT")"
