---
branch: dm/quirky-goodall-lemgjm
commit: a461a7bb1b222434aeded98436ea7a5ce72f70aa
base: 70134819ecbd2cc876bfa16ee10601e40cf04d5e
mode: fast
createdAt: 2026-10-28T11:51:48.546Z
isFinalized: true
groups: 80
rules: [atom-lifetime-bound-to-owner, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code]
reviewId: a461a7bb
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a461a7bb-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.test.ts:45
- a461a7bb-2 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:116
- a461a7bb-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:284

## Issues

# WARN a461a7bb-1 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.test.ts:45`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 45-56 (`yield* Effect.promise(() => reader.open());`, location confidence 0.56). Judged with added `imports, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN a461a7bb-2 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:116`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 116-139 (`export class Binder extends Resource {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN a461a7bb-3 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:284`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 284-307 (`log.warn('bindings sync failed; keeping the current bindings', { error });`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `70134819ecbd2cc876bfa16ee10601e40cf04d5e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 83 uncertain, 27 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 65 (53 verdicts re-asked with context the model requested)
estimated input tokens: 866745
billed input tokens: 833333 (cost $0.0350)
measured chars per token: 3.12
```
