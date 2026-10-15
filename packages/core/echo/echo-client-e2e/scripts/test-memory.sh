#!/usr/bin/env bash
# One vitest process per retention suite or test; see the `test-memory` task in moon.yml.
set -u

status=0
run() {
  pnpm exec dx-killorphans vitest run --project=node \
    --tagsFilter="${VITEST_TAGS_FILTER:-!flaky && !sync && !sync-e2e && !functions-e2e}" "$@" || status=1
}

run src/feed-retention.test.ts
run src/automerge-retention.test.ts -t 'collecting removed objects releases them'
run src/automerge-retention.test.ts -t 'dropping the caller reference releases objects'
exit "$status"
