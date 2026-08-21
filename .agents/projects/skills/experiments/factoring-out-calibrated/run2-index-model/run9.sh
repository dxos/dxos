#!/usr/bin/env bash
#   C = index pointer in CLAUDE.md + general-purpose code-style skill
#   D = general-purpose code-style skill only, no pointer
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
ARM=$1 REP=$2
DIR="$WS/runs/${ARM}__${REP}"
[ -f "$DIR/.done" ] && exit 0
rm -rf "$DIR"; cp -r "$WS/fixture-d2" "$DIR"
cp "$WS/arms/claude-base.md" "$DIR/CLAUDE.md"
[ "$ARM" = "C" ] && cat "$WS/arms/pointer.md" >> "$DIR/CLAUDE.md"
mkdir -p "$DIR/.claude/skills"; cp -r "$WS/skill/code-style" "$DIR/.claude/skills/"
( cd "$DIR" && git add -A && git commit -qm setup )
cd "$DIR" || exit 1
timeout 600 claude -p "$(cat "$WS/arms/task.txt")" --model sonnet \
  --output-format stream-json --verbose \
  --allowedTools Read Edit Write Bash Glob Grep < /dev/null 2>/dev/null \
| python3 -c '
import sys, json
f=[]
for line in sys.stdin:
    try: d=json.loads(line)
    except: continue
    if d.get("type")=="assistant":
        for c in d.get("message",{}).get("content",[]):
            if c.get("type")=="tool_use" and c.get("name")=="Skill": f.append(c.get("input",{}).get("skill"))
print(json.dumps({"fired":f}))
' > "$DIR/.fired.json"
touch "$DIR/.done"; echo "$ARM $REP done"
