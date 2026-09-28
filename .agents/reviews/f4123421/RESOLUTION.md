# Resolution — f4123421

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f4123421-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:75
- f4123421-2 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:243
- f4123421-3 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:411
- f4123421-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- f4123421-5 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.test.ts:224
- f4123421-6 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:500
- f4123421-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:716
- f4123421-8 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:375
- f4123421-9 - ignored - no-casts - packages/core/mesh/edge-client/src/testing/test-utils.ts:37

<!-- All nine are ignored as out of scope: `git blame` puts every flagged line in a commit already on `main`. Where this PR edits nearby code it adds none of these patterns: its new tests wait with `expect.poll`, a condition wait rather than a sleep, and its `createResponseSender` change removes a non-null assertion. -->
