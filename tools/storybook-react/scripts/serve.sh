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

# A forwarded --port is not necessarily one of the watcher's known ports (launch.json only lists
# the default configurations), so register it before the watcher starts — otherwise storybook
# serves on it but the watcher never discovers it. Last occurrence wins, same as storybook's own
# argument parsing.
PORT=9009
prev=''
for arg in "$@"; do
  case "$arg" in
    --port=*) PORT="${arg#--port=}" ;;
    *) [ "$prev" = '--port' ] && PORT="$arg" ;;
  esac
  prev="$arg"
done
# Never fatal, same as --ensure below: a registration failure should not block storybook.
bash "${DIR}/diagnose.sh" --register-port "$PORT" || echo "warning: could not register port ${PORT} with the watcher."

# Never fatal: a missing watcher is worth a warning, not a storybook that refuses to start.
bash "${DIR}/diagnose.sh" --ensure || echo "warning: could not arm the hang watcher."

exec "${DIR}/../node_modules/.bin/storybook" dev "$@"
