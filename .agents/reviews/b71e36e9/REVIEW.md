---
branch: dm/compassionate-wozniak-dxx8fw
commit: b71e36e9ec5a2dda7d8c1ae5b5452886359be9ca
base: b11b9e5eca16827dbf28b2da15e0d9f0e14b8a80
mode: fast
createdAt: 2026-11-04T11:12:19.576Z
isFinalized: true
groups: 79
rules: [effect-fn-not-hand-wrapped-gen, no-mixed-promise-effect-lifecycle, use-context-scoped-cancellation]
reviewId: b71e36e9
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b71e36e9-1 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- b71e36e9-2 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- b71e36e9-3 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:135

## Issues

# WARN b71e36e9-1 use-context-scoped-cancellation `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 63-74 (`export const withDeadline = <T>(`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `withDeadline` must be a Promise race: the start request runs inside `Effect.uninterruptible` (so a cancel learns the chat id), and an Effect timeout cannot interrupt work in that region.

# WARN b71e36e9-2 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 63-74 (`export const withDeadline = <T>(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Same as b71e36e9-1: the deadline belongs to the request promise because the surrounding effect is uninterruptible.

# WARN b71e36e9-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:135`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 135-149 (`export const authenticate = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b11b9e5eca16827dbf28b2da15e0d9f0e14b8a80`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 73 uncertain, 78 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 82 (44 verdicts re-asked with context the model requested)
estimated input tokens: 537686
billed input tokens: 513102 (cost $0.0216)
measured chars per token: 3.14
```
