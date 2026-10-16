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
ln -s "$DEMO_ROOT/packages/devtools/cli/bin/dx" "$DEMO_BIN/dx"
export PATH="$DEMO_BIN:$PATH"
export DX_PROFILE="${DEMO_DX_PROFILE:-autocue-drawing-sh}"

# The CLI has no offline way to create an identity (`dx account signup` needs the hub), so the take provisions
# one through the CLI's own test bootstrap.
dx reset --hard >/dev/null 2>&1
(cd "$DEMO_ROOT/packages/devtools/cli" && bun run src/testing/bootstrap-profile.ts >/dev/null 2>&1)

# Clears only a directory this script set up before (marked), or an empty one: never a checkout by mistake.
if [ -n "$(ls -A)" ] && [ ! -f .drawing-demo ]; then
  echo "agent-demo.sh: $PWD is not empty and was not set up by this script; give the stage an empty --cwd." >&2
  return 1
fi
rm -rf ./* ./.claude ./.git
touch .drawing-demo
cp -r "$DEMO_HERE/fixtures/shop/." .
git init -q . 2>/dev/null
npx -y skills add "$DEMO_ROOT/packages/devtools/drawing" --skill drawing -a claude-code -y >/dev/null 2>&1
