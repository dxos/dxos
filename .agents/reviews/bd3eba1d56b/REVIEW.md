---
branch: HEAD
commit: bd3eba1d56b235aaabc7b5cc54b07f04f9e583bf
base: a6d32c6eb7810d93f171895cc5cc7778d367e4c4
mode: fast
createdAt: 2026-10-03T19:34:43.687Z
isFinalized: true
groups: 48
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: bd3eba1d56b
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd3eba1d56b-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150
- bd3eba1d56b-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366
- bd3eba1d56b-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390

## Issues

# WARN bd3eba1d56b-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 150-173 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd3eba1d56b-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 366-389 (`setPrimary={setLoginPrimary}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd3eba1d56b-3 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 390-413 (`style={{`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a6d32c6eb7810d93f171895cc5cc7778d367e4c4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 28 uncertain, 13 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 27 (12 verdicts re-asked with context the model requested)
estimated input tokens: 446468
billed input tokens: 446732 (cost $0.0188)
measured chars per token: 3.00
```
