#!/bin/sh

set -exuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/dev.sh

dx agent stop
dx reset --force --no-agent
dx halo create Tester --no-agent
dx halo --no-agent --json
dx agent list

#dx agent run --socket --web-socket=4567 --http=3000
