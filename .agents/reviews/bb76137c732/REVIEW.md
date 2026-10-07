---
branch: claude/react-ui-next-design-4db6eb
commit: bb76137c7323d65053ba2cbb7ecaf69d52a44aae
base: 56ebcecb4bc0b4670831f310f343e4a79eec2afa
mode: fast
createdAt: 2026-10-05T02:26:31.677Z
isFinalized: true
groups: 63
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, no-styling-wrapper-divs]
reviewId: bb76137c732
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bb76137c732-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59
- bb76137c732-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:93
- bb76137c732-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158
- bb76137c732-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-settings/src/operations/open.ts:16

## Issues

# WARN bb76137c732-1 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 59-70 (`const DefaultStory = () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb76137c732-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 93-107 (`const BreadcrumbStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb76137c732-3 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 158-176 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb76137c732-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-settings/src/operations/open.ts:16`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 16-27 (`const handler: Operation.WithHandler<typeof SettingsOperation.Open> = Setting...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `56ebcecb4bc0b4670831f310f343e4a79eec2afa`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 129 uncertain, 102 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 187 (84 verdicts re-asked with context the model requested)
estimated input tokens: 2373855
billed input tokens: 2303549 (cost $0.0967)
measured chars per token: 3.09
```
