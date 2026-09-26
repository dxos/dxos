# Resolution — ff6a268f

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ff6a268f-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:75
<!-- Lines 75-86 predate this PR, which does not change the manager's lifecycle. -->
- ff6a268f-2 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:243
<!-- The `root!.doc()!` assertions on lines 245-246 predate this PR, which does not touch that test. -->
- ff6a268f-3 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:411
<!-- The `sleep(200)` is in a test that predates this PR; the tests this PR adds wait with `expect.poll`. -->
- ff6a268f-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
<!-- `removeSpace` predates this PR and is unchanged by it. -->
- ff6a268f-5 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.test.ts:224
<!-- `{} as EdgeHttpClient` predates this PR, which only added a parameter to the fixture below it. -->
- ff6a268f-6 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:500
<!-- The inbound decode predates this PR and is unchanged by it. -->
- ff6a268f-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:716
<!-- The flush timer predates this PR and is unchanged by it. -->
- ff6a268f-8 - resolved - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:342
<!-- `WebSocketClosedError`, which this PR adds, now uses `BaseError.extend`; `SegmentedMessageLimitError` predates it (DX-1309). -->
- ff6a268f-9 - ignored - no-casts - packages/core/mesh/edge-client/src/testing/test-utils.ts:37
<!-- `connection!.muxer` predates this PR, which changed only the response sender below it. -->
