#!/bin/sh

set -euxo pipefail

#sudo killall node

. $(git rev-parse --show-toplevel)/packages/devtools/cli/scripts/dev.sh

dx agent stop
dx reset --force
dx halo create "DXOS Agent" --no-agent
dx halo identity --no-agent
dx agent start -f
