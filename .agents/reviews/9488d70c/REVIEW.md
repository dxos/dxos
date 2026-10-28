---
branch: dm/quirky-goodall-lemgjm
commit: 9488d70c029272498d2146e87892675391458837
base: 711e08aa13e60b9ff93d0497b7481a64775c3b0e
mode: fast
createdAt: 2026-10-28T12:42:21.284Z
isFinalized: true
groups: 80
rules: [atom-lifetime-bound-to-owner, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code]
reviewId: 9488d70c
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9488d70c-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.test.ts:45
- 9488d70c-2 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:116
- 9488d70c-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.ts:116
- 9488d70c-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:284

## Issues

# WARN 9488d70c-1 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.test.ts:45`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 45-56 (`yield* Effect.promise(() => reader.open());`, location confidence 0.52). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 9488d70c-2 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:116`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 116-139 (`export class Binder extends Resource {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9488d70c-3 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.ts:116`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 116-139 (`export class Binder extends Resource {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9488d70c-4 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:284`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 284-307 (`try {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `711e08aa13e60b9ff93d0497b7481a64775c3b0e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 98 uncertain, 51 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 86 (67 verdicts re-asked with context the model requested)
estimated input tokens: 1033176
billed input tokens: 986037 (cost $0.0414)
measured chars per token: 3.14
```
