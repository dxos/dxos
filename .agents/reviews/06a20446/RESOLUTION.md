# Resolution — 06a20446

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->
<!-- 06a20446-1: `find<any>(url as AutomergeUrl)` is an existing test line outside this PR's diff. -->
<!-- 06a20446-2: the `sleep(NO_TRAFFIC_WINDOW_MS)` is an existing negative assertion outside this PR's diff; its comment says the bounded window is the assertion. -->

- 06a20446-1 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:267
- 06a20446-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:579
