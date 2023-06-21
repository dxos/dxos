#!/bin/sh

set -exuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/dev.sh

dx-dev agent stop
dx-dev reset --force --no-agent
dx-dev halo create Tester --no-agent
dx-dev halo --no-agent --json
dx-dev agent list

#dx-dev agent run --socket --web-socket=4567 --http=3000
