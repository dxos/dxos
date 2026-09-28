# Resolution — 774e2e2f

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 774e2e2f-1 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:336
<!-- `SegmentedMessageLimitError` predates this PR (DX-1309); the errors this PR adds, `WebSocketClosedError` and `MessageTooLargeError`, use `BaseError.extend`. -->
