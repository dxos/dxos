---
branch: dm/cool-lovelace-vxbkap
commit: ca9ccb809ac6eab10446cad812c876ff7e75678c
base: 9ee4560e1c976286796c5758a0634e66fe45256e
mode: fast
createdAt: 2026-10-27T10:02:02.682Z
isFinalized: true
groups: 92
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, dont-leak-internal-api-through-public-surface, no-casts, no-try-catch-in-effect-code]
reviewId: ca9ccb80
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ca9ccb80-1 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/hypergraph.ts:629
- ca9ccb80-2 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/hypergraph.ts:952
- ca9ccb80-3 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/query/working-set-executor.ts:780
- ca9ccb80-4 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:806
- ca9ccb80-5 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:970
- ca9ccb80-6 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1329

## Issues

# WARN ca9ccb80-1 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/hypergraph.ts:629`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 629-652 (`const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN ca9ccb80-2 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/hypergraph.ts:952`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.82. The likeliest place is lines 952-974 (`export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ca9ccb80-3 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/query/working-set-executor.ts:780`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 780-806 (`if (property !== null) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ca9ccb80-4 consistent-private-field-convention `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:806`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 806-829 (`});`, location confidence 0.06). Judged with added `test` context after a first pass of 0.16. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ca9ccb80-5 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:970`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 970-993 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ca9ccb80-6 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1329`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 1329-1352 (`#scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: Docu...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9ee4560e1c976286796c5758a0634e66fe45256e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 225 uncertain, 133 clean, 0 unanswered
- left for an agentic reviewer: 81 batch(es)

```text
requests: 233 (125 verdicts re-asked with context the model requested)
estimated input tokens: 3951762
billed input tokens: 4053422 (cost $0.1702)
measured chars per token: 2.92
```
