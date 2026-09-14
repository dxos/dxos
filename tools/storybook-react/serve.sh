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

# The dev server watches with `fs.watch` (see `.storybook/main.ts`), which costs one descriptor per
# watched directory — ~12k on this monorepo. A server launched from a GUI shell inherits macOS's
# 256 soft limit and exhausts it within seconds, so raise it here, before the watcher is armed, so
# that `diagnose.sh` reports the limit the server actually runs under.
# Descending, because the ceiling is per-machine: the hard limit is usually `unlimited` but the
# kernel still refuses anything above `kern.maxfilesperproc`.
for limit in 200000 65536 10240; do
  if ulimit -Sn "${limit}" 2>/dev/null; then
    break
  fi
done
if [ "$(ulimit -Sn)" -lt 10240 ] 2>/dev/null; then
  echo "warning: descriptor limit is only $(ulimit -Sn); the file watcher will exhaust it."
fi

# Never fatal: a missing watcher is worth a warning, not a storybook that refuses to start.
bash "${DIR}/diagnose.sh" --ensure --port "${PORT}" || echo "warning: could not arm the hang watcher."

exec "${DIR}/node_modules/.bin/storybook" dev "$@"
