---
branch: dm/vibrant-einstein-yt4lvp
commit: 90213fe21c51b6b3ba0802acb0d10bd21fa01b33
base: a2021ca16b21d0cb8885c57ed88294d542589346
mode: fast
createdAt: 2026-09-28T07:47:46.989Z
isFinalized: true
groups: 50
rules: [effect-fn-not-hand-wrapped-gen, no-casts]
reviewId: 90213fe2
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 90213fe2-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- 90213fe2-2 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- 90213fe2-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts:34

## Issues

# WARN 90213fe2-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 90213fe2-2 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 90213fe2-3 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 34-45 (`export const openObject = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a2021ca16b21d0cb8885c57ed88294d542589346`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 68 uncertain, 75 clean, 0 unanswered

```text
requests: 95 (43 verdicts re-asked with context the model requested)
estimated input tokens: 503790
billed input tokens: 481766 (cost $0.0202)
measured chars per token: 3.14
```
