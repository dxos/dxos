#
# Copyright 2026 DXOS.org
#

# Sourced by the terminal stage (`--init`) before the first prompt of the `dx-drawing.mjs` take: a fresh copy of
# the diagram in the working directory, and `dx` from this checkout on the profile the setup step provisions.

DX_DEMO_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DX_DEMO_ROOT="$(cd "$DX_DEMO_HERE/../../../.." && pwd)"

export DX_PROFILE="${DX_DEMO_PROFILE:-autocue-dx-drawing}"

dx() {
  "$DX_DEMO_ROOT/packages/devtools/cli/bin/dx" "$@"
}

# Every take starts from an empty profile, so `dx drawing list` shows only what this take imported. The CLI has no
# offline way to create an identity (`dx account signup` needs the hub), so the profile is provisioned with an
# identity and a space through the CLI's own test bootstrap.
dx reset --hard >/dev/null 2>&1
(cd "$DX_DEMO_ROOT/packages/devtools/cli" && bun run src/testing/bootstrap-profile.ts >/dev/null 2>&1)

rm -f ./*.svg
cp "$DX_DEMO_HERE/pipeline.dx" ./pipeline.dx
