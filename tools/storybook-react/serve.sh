#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Starts the storybook dev server with a hang watcher beside it.
#
# The server wedges periodically and a restart destroys the only evidence, so the watcher has to
# already be running when it happens — leaving that to whoever hits the hang is why it has stayed
# undiagnosed. Arming it here makes it the default rather than something to remember.
#
# Every argument is forwarded to `storybook dev`, so this is a drop-in for it.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The watcher polls one port, so it must be told the one this invocation actually serves — callers
# override it (`moon run storybook-react:serve -- --port=9014`), and watching 9009 by default would
# then watch somebody else's server.
PORT=9009
previous=""
for arg in "$@"; do
  case "${previous}" in
    -p|--port) PORT="${arg}" ;;
  esac
  case "${arg}" in
    --port=*) PORT="${arg#--port=}" ;;
  esac
  previous="${arg}"
done

# Never fatal: a missing watcher is worth a warning, not a storybook that refuses to start.
bash "${DIR}/diagnose.sh" --ensure --port "${PORT}" || echo "warning: could not arm the hang watcher."

exec "${DIR}/node_modules/.bin/storybook" dev "$@"
