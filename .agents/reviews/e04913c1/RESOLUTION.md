# Resolution — e04913c1

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->
<!-- e04913c1-1: the `setTimeout(..., 20)` is in an existing test; this PR's test diff is the new test at lines 147-169. -->
<!-- e04913c1-2: the flagged line is an existing import; the error classes extend `Error` in `errors.ts`, which this PR does not change. -->
<!-- e04913c1-3: the test server's `newestConnection()!` assertions are replaced by `requireNewestConnection()`, which asserts with `invariant`. -->

- e04913c1-1 - ignored - no-sleep-in-test - packages/core/mesh/edge-client/src/edge-client.test.ts:93
- e04913c1-2 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-client.ts:37
- e04913c1-3 - resolved - no-casts - packages/core/mesh/edge-client/src/testing/test-utils.ts:87
