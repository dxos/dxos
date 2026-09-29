# Resolution — 33dc23e6ea

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->
<!-- 33dc23e6ea-1: the flagged `loaded.doc()!` is in a test this change edits, so it now reads `loaded.doc()?.text`; the new test's own non-null assertions became an `invariant`. -->
<!-- 33dc23e6ea-2, 33dc23e6ea-4: sleeps in existing tests this change does not touch; its own waits poll for the eviction. -->
<!-- 33dc23e6ea-3, 33dc23e6ea-5, 33dc23e6ea-6, 33dc23e6ea-7: existing code outside this change's diff, which adds only the pending-sync check to `_evictDocument`. -->

- 33dc23e6ea-1 - resolved - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:92
- 33dc23e6ea-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:884
- 33dc23e6ea-3 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:245
- 33dc23e6ea-4 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353
- 33dc23e6ea-5 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:476
- 33dc23e6ea-6 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:984
- 33dc23e6ea-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1680
