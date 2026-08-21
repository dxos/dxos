#!/usr/bin/env bash
# Experiment 6, steps 1 and 2 of the protocol:
#   E = no rule anywhere       -> does the control FAIL? (baseline must fail)
#   A = rule in CLAUDE.md      -> does the bullet FIX it? (must beat E)
# Only if A beats E does testing a self-triggering skill mean anything.
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
ARM=$1 REP=$2
DIR="$WS/runs/${ARM}__${REP}"
[ -f "$DIR/.done" ] && exit 0
rm -rf "$DIR"; cp -r "$WS/fixture" "$DIR"
cp "$WS/arms/claude-base.md" "$DIR/CLAUDE.md"
[ "$ARM" = "A" ] && cat "$WS/arms/rule-line.md" >> "$DIR/CLAUDE.md"
( cd "$DIR" && git add -A && git commit -qm setup )
cd "$DIR" || exit 1
timeout 600 claude -p "$(cat "$WS/arms/task.txt")" --model sonnet \
  --output-format stream-json --verbose \
  --allowedTools Read Edit Write Bash Glob Grep < /dev/null 2>/dev/null \
| python3 -c '
import sys, json
t=[]
for line in sys.stdin:
    try: d=json.loads(line)
    except: continue
    if d.get("type")=="assistant":
        for c in d.get("message",{}).get("content",[]):
            if c.get("type")=="text": t.append(c["text"])
print(json.dumps({"text":"\n".join(t)}))
' > "$DIR/.result.json"
touch "$DIR/.done"; echo "$ARM $REP done"
