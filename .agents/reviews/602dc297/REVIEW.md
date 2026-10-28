---
branch: dm/quirky-goodall-lemgjm
commit: 602dc29763a8a43c25aebc0059cdf02834293a31
base: 70134819ecbd2cc876bfa16ee10601e40cf04d5e
mode: fast
createdAt: 2026-10-28T11:38:20.683Z
isFinalized: true
groups: 78
rules: [atom-lifetime-bound-to-owner, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code]
reviewId: 602dc297
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 602dc297-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.test.ts:45
- 602dc297-2 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:116
- 602dc297-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:284
- 602dc297-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.ts:670

## Issues

# WARN 602dc297-1 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.test.ts:45`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 45-56 (`yield* Effect.promise(() => reader.open());`, location confidence 0.52). Judged with added `imports, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 602dc297-2 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:116`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 116-139 (`export class Binder extends Resource {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 602dc297-3 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:284`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 284-307 (`} catch (error) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 602dc297-4 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.ts:670`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 670-681 (`export const boundObjects = (feed: Feed.Feed): Effect.Effect<Ref.Ref<Obj.Unkn...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `70134819ecbd2cc876bfa16ee10601e40cf04d5e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 80 uncertain, 27 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 64 (58 verdicts re-asked with context the model requested)
estimated input tokens: 859687
billed input tokens: 825867 (cost $0.0347)
measured chars per token: 3.12
```
