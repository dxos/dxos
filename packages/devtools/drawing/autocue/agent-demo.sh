#
# Copyright 2026 DXOS.org
#

# Sourced by the terminal stage (`--init`) before the first prompt of the `agent-demo.mjs` take: a copy of the
# sample repo with the drawing skill installed, `drawing` and `dx` from this checkout on PATH as real
# executables (the agent's shell does not see shell functions), and a fresh DXOS profile with an identity and
# a space for `dx drawing import`.

DEMO_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_ROOT="$(cd "$DEMO_HERE/../../../.." && pwd)"

DEMO_BIN="$(mktemp -d)"
ln -s "$DEMO_ROOT/packages/devtools/drawing/bin/drawing.js" "$DEMO_BIN/drawing"
# A wrapper, not a symlink: `bin/dx` locates its sources from its own path.
printf '#!/bin/bash\nexec "%s" "$@"\n' "$DEMO_ROOT/packages/devtools/cli/bin/dx" > "$DEMO_BIN/dx"
chmod +x "$DEMO_BIN/dx"
export PATH="$DEMO_BIN:$PATH"
# Started from inside an agent session, the take would otherwise inherit its child-session marker.
unset CLAUDE_CODE_CHILD_SESSION
export DX_PROFILE="${DEMO_DX_PROFILE:-autocue-drawing-sh}"
# A CLI profile created under DX_LOCAL_DEV=1 points at EDGE preview (`0` or unset means production), the
# EDGE the `bundle-e2e` Composer the take opens at the end also syncs through.
export DX_LOCAL_DEV=1

# Clears only a directory this script set up before (marked), or an empty one: never a checkout by mistake.
# Checked before the profile reset below, so a wrong --cwd changes nothing.
if [ -n "$(ls -A)" ] && [ ! -f .drawing-demo ]; then
  echo "agent-demo.sh: $PWD is not empty and was not set up by this script; give the stage an empty --cwd." >&2
  return 1
fi

# The CLI has no offline way to create an identity (`dx account signup` needs the hub), so the take provisions
# one through the CLI's own test bootstrap.
dx reset --hard >/dev/null 2>&1
(cd "$DEMO_ROOT/packages/devtools/cli" && bun run src/testing/bootstrap-profile.ts >/dev/null 2>&1)

rm -rf ./* ./.claude ./.git
touch .drawing-demo
cp -r "$DEMO_HERE/fixtures/shop/." .
git init -q . 2>/dev/null
npx -y skills add "$DEMO_ROOT" --skill drawing -a claude-code -y >/dev/null
