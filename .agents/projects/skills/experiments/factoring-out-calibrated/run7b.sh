#!/usr/bin/env bash
# Three-arm test at the calibrated operating point (density 2).
#   E = nothing   A = rule as CLAUDE.md bullet   B = rule factored into a skill
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
D=$1 ARM=$2 REP=$3
DIR="$WS/runs/d${D}__${ARM}__${REP}"
[ -f "$DIR/.done" ] && exit 0
rm -rf "$DIR"; cp -r "$WS/fixture-d${D}" "$DIR"
cp "$WS/arms/claude-base.md" "$DIR/CLAUDE.md"
case "$ARM" in
  A) cat "$WS/arms/rule-line.md" >> "$DIR/CLAUDE.md" ;;
  B) mkdir -p "$DIR/.claude/skills" && cp -r "$WS/arms/skill/type-friction" "$DIR/.claude/skills/" ;;
esac
( cd "$DIR" && git add -A && git commit -qm setup )
cd "$DIR" || exit 1
timeout 600 claude -p "$(cat "$WS/arms/task.txt")" --model sonnet \
  --output-format stream-json --verbose \
  --allowedTools Read Edit Write Bash Glob Grep < /dev/null 2>/dev/null \
| python3 -c '
import sys, json
fired=[]
for line in sys.stdin:
    try: d=json.loads(line)
    except: continue
    if d.get("type")=="assistant":
        for c in d.get("message",{}).get("content",[]):
            if c.get("type")=="tool_use" and c.get("name")=="Skill": fired.append(c.get("input",{}).get("skill"))
print(json.dumps({"fired":fired}))
' > "$DIR/.fired.json"
touch "$DIR/.done"; echo "d$D $ARM $REP done"
