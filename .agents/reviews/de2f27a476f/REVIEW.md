---
branch: HEAD
commit: de2f27a476f0ab1dc54c8a67258cdd5b4b0fa762
base: cab8879e10ba7f1bb6538773c1d5c8677ce0172a
mode: fast
createdAt: 2026-10-03T17:46:16.256Z
isFinalized: true
groups: 48
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: de2f27a476f
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- de2f27a476f-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20
- de2f27a476f-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150
- de2f27a476f-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366
- de2f27a476f-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390

## Issues

# WARN de2f27a476f-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 20-31 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN de2f27a476f-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 150-173 (`useEffect(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN de2f27a476f-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 366-389 (`setPrimary={setLoginPrimary}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN de2f27a476f-4 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 390-413 (`backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff8...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cab8879e10ba7f1bb6538773c1d5c8677ce0172a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 50 uncertain, 56 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 64 (23 verdicts re-asked with context the model requested)
estimated input tokens: 586105
billed input tokens: 577815 (cost $0.0243)
measured chars per token: 3.04
```
