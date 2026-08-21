#!/usr/bin/env bash
# Experiment 5: factoring a Non-negotiable out of CLAUDE.md into a skill,
# measured against a REAL repo with real files and real tools.
#   A = rule as a bullet in CLAUDE.md   B = rule as a skill   E = neither
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
ARM=$1 REP=$2
DIR="$WS/runs/${ARM}__${REP}"
[ -f "$DIR/.done" ] && exit 0
rm -rf "$DIR"; cp -r "$WS/fixture" "$DIR"

cp "$WS/arms/claude-base.md" "$DIR/CLAUDE.md"
case "$ARM" in
  A) cat "$WS/arms/rule-line.md" >> "$DIR/CLAUDE.md" ;;
  B) mkdir -p "$DIR/.claude/skills" && cp -r "$WS/arms/skill/no-compat-shims" "$DIR/.claude/skills/" ;;
  E) : ;;
esac
( cd "$DIR" && git add -A && git commit -qm "arm setup" )

cd "$DIR" || exit 1
timeout 600 claude -p "$(cat "$WS/arms/task.txt")" --model sonnet \
  --output-format stream-json --verbose \
  --allowedTools Read Edit Write Bash Glob Grep \
  < /dev/null 2>/dev/null \
| python3 -c '
import sys, json
text=[]; fired=[]
for line in sys.stdin:
    try: d=json.loads(line)
    except: continue
    if d.get("type")=="assistant":
        for c in d.get("message",{}).get("content",[]):
            if c.get("type")=="text": text.append(c["text"])
            if c.get("type")=="tool_use" and c.get("name")=="Skill": fired.append(c.get("input",{}).get("skill"))
print(json.dumps({"fired":fired,"text":"\n".join(text)}))
' > "$DIR/.result.json"
touch "$DIR/.done"
echo "$ARM $REP done"
