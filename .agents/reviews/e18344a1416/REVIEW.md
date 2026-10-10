---
branch: claude/react-ui-next-design-4db6eb
commit: e18344a14162aa7b3b66cbc125511703aa4963ac
base: 8f53fb9869652d9a216a7c3e35219ce41d51359f
mode: fast
createdAt: 2026-10-03T18:52:50.439Z
isFinalized: true
groups: 67
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, no-casts, no-styling-wrapper-divs]
reviewId: e18344a1416
---

_1 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e18344a1416-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:288
- e18344a1416-2 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73
- e18344a1416-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- e18344a1416-4 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:490

## Issues

# WARN e18344a1416-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 288-299 (`export const resolve = (key: string): Effect.Effect<Skill, NotFoundError, Reg...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e18344a1416-2 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 73-84 (`const meta = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e18344a1416-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-53 (`const styles = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e18344a1416-4 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:490`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 490-501 (`onSubmit({ name: name.trim(), url: url.trim(), protocol, apiKey: apiKey.trim(...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8f53fb9869652d9a216a7c3e35219ce41d51359f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 119 uncertain, 105 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 144 (65 verdicts re-asked with context the model requested)
estimated input tokens: 1232395
billed input tokens: 1221382 (cost $0.0513)
measured chars per token: 3.03
```
