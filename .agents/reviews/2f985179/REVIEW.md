---
branch: dm/charming-maxwell-j23a59
commit: 2f9851798882077fbb7fda4830c95af053a55f4f
base: 3aef671a11a223a5640de7c1a6cf73685b21c537
mode: fast
createdAt: 2026-10-26T06:04:08.468Z
isFinalized: true
groups: 79
rules: [consistent-private-field-convention, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, use-context-scoped-cancellation]
reviewId: 2f985179
---

_1 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2f985179-1 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:50
- 2f985179-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:158
- 2f985179-3 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- 2f985179-4 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:518
- 2f985179-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122
- 2f985179-6 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210
- 2f985179-7 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402
- 2f985179-8 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:570

## Issues

# WARN 2f985179-1 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:50`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 50-61 (`describe('IndexQuerySource', () => {`, location confidence 0.08). Judged with added `test` context after a first pass of 0.15. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-2 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:158`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 158-169 (`onTestFinished(() => source.close());`, location confidence 0.17). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2f985179-3 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-4 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:518`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 518-529 (`graph: mockGraph,`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-5 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 122-137 (`export class IndexQuerySource implements RemoteQuerySource {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-6 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 210-233 (`void this._hydrationCtx?.dispose().catch(() => {});`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-7 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 402-425 (`try {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2f985179-8 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:570`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 570-593 (`try {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3aef671a11a223a5640de7c1a6cf73685b21c537`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 68 uncertain, 36 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 65 (48 verdicts re-asked with context the model requested)
estimated input tokens: 1073286
billed input tokens: 1035626 (cost $0.0435)
measured chars per token: 3.11
```

## Triage

All eight are ignored. 1, 2, 5, 6 and 7 sit on lines this PR does not change. 1 also names a test
file that has no class. 4 is the existing `index progress restarts the one-shot budget` test, not a
new one. 3 is the existing loader-boundary fake; the two new tests use the same fake, and an
`Entity.Unknown` cannot be built without the full ECHO stack the unit test avoids. 8 is the
pass-scoped hydration timer: it is cleared in a `finally`, and context disposal settles every record
through `ContextDisposedError`, so the pass and its timer end with the context.
