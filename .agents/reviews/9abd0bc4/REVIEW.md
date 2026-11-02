---
branch: dm/quirky-goodall-lemgjm
commit: 9abd0bc4e7d4cdbfe1291ca47fe2d394335f6ba8
base: ddd3c78a73147014581354a52a896fd80f506f6c
mode: fast
createdAt: 2026-10-28T10:05:21.138Z
isFinalized: true
groups: 77
rules: [atom-lifetime-bound-to-owner, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code]
reviewId: 9abd0bc4
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9abd0bc4-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.test.ts:45
- 9abd0bc4-2 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:111
- 9abd0bc4-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.ts:111
- 9abd0bc4-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:255

## Issues

# WARN 9abd0bc4-1 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.test.ts:45`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 45-56 (`yield* Effect.promise(() => reader.open());`, location confidence 0.56). Judged with added `imports, test` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 9abd0bc4-2 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:111`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 111-134 (`export class Binder extends Resource {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9abd0bc4-3 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.ts:111`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 111-134 (`export class Binder extends Resource {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9abd0bc4-4 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:255`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 255-278 (`);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ddd3c78a73147014581354a52a896fd80f506f6c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 81 uncertain, 25 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 64 (57 verdicts re-asked with context the model requested)
estimated input tokens: 813831
billed input tokens: 782951 (cost $0.0329)
measured chars per token: 3.12
```
