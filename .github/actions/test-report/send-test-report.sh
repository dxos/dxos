#!/bin/bash

# Fail loudly: a report that cannot be delivered has to surface as a red step, otherwise the nightly
# looks reported when nobody was told.
set -euo pipefail

NAME="${1:-unknown}"
RESULT="${2:-unknown}"

ROLE_ID=1166483404066402414
GREEN=4783872
ORANGE=16744192
RED=16711680
GH_BUILD_URL="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"

if [ -z "${DISCORD_TEST_REPORT_WEBHOOK:-}" ]; then
  echo "::error title=Test report not sent::DISCORD_TEST_REPORT_WEBHOOK is unset ($NAME: $RESULT)"
  exit 1
fi

# Discord answers 204 with an empty body. Anything else — including a 3xx from a stale or proxied webhook
# URL, which curl reports as success since redirects are not followed — means nobody was told.
function notify() {
  local message response status body
  message=$(
    printf '{ "content": %s, "embeds": [{ "title": %s, "description": %s, "color": %s }] }' \
      "\"$1\"" "\"$2: $NAME\"" "\"$GH_BUILD_URL\"" "$3"
  )
  echo "$message"
  response=$(
    curl --silent --show-error --write-out '\n%{http_code}' -H "Content-Type: application/json" \
      -d "$message" "$DISCORD_TEST_REPORT_WEBHOOK"
  )
  status=${response##*$'\n'}
  body=${response%$'\n'*}
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "::error title=Test report not delivered::Discord webhook returned $status ($NAME: $RESULT) $body"
    return 1
  fi
}

case "$RESULT" in
  success)
    notify "🌈✨✅" "Daily testing successful" "$GREEN"
    ;;
  # A cancelled job means the run never produced a verdict (job timeout, or the run was cancelled), so it
  # must not read as a test failure — nothing was proven either way.
  cancelled | skipped)
    notify "⏹️ <@&$ROLE_ID>" "Daily testing did not complete ($RESULT)" "$ORANGE"
    ;;
  *)
    notify "⚠️ <@&$ROLE_ID>" "Daily testing failed" "$RED"
    ;;
esac
