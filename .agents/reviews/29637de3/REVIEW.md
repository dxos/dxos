---
branch: dm/quirky-goodall-lemgjm
commit: 29637de38fd04b8a0f6dce7b6ae5cc0f0311a57a
base: 711e08aa13e60b9ff93d0497b7481a64775c3b0e
mode: fast
createdAt: 2026-10-28T12:30:47.252Z
isFinalized: true
groups: 80
rules: [atom-lifetime-bound-to-owner, no-try-catch-in-effect-code, retries-via-schedule-with-evidence]
reviewId: 29637de3
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 29637de3-1 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:116
- 29637de3-2 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:284
- 29637de3-3 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant/src/session/AiContext.ts:284

## Issues

# WARN 29637de3-1 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:116`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 116-139 (`export class Binder extends Resource {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29637de3-2 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:284`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 284-307 (`results = await this.#bindingsQuery.run();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29637de3-3 retries-via-schedule-with-evidence `packages/core/compute/assistant/src/session/AiContext.ts:284`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.82. The likeliest place is lines 284-307 (`results = await this.#bindingsQuery.run();`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `711e08aa13e60b9ff93d0497b7481a64775c3b0e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 99 uncertain, 51 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 88 (70 verdicts re-asked with context the model requested)
estimated input tokens: 1028745
billed input tokens: 983253 (cost $0.0413)
measured chars per token: 3.14
```
