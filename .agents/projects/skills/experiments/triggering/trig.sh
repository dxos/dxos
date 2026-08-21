#!/usr/bin/env bash
# Measure real skill triggering: run one prompt in the repo, record which skills fired.
# $1 = case index, $2 = rep
set -uo pipefail
WS="$(cd "$(dirname "$0")" && pwd)"
IDX=$1 REP=$2
OUT="$WS/runs/case${IDX}__r${REP}.json"
[ -s "$OUT" ] && exit 0
PROMPT=$(python3 -c "import json,sys;print(json.load(open('$WS/cases.json'))[$IDX]['prompt'])")
cd /home/user/dxos
timeout 300 claude -p "$PROMPT" --model sonnet \
  --output-format stream-json --verbose --allowedTools Skill \
  < /dev/null 2>/dev/null \
| python3 -c '
import sys, json
fired=[]
for line in sys.stdin:
    try: d=json.loads(line)
    except: continue
    if d.get("type")=="assistant":
        for c in d.get("message",{}).get("content",[]):
            if c.get("type")=="tool_use" and c.get("name")=="Skill":
                fired.append(c.get("input",{}).get("skill"))
print(json.dumps({"fired":fired}))
' > "$OUT"
echo "case$IDX r$REP -> $(cat "$OUT")"
