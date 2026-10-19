---
branch: HEAD
commit: fd1abe58ba80efd277529f107312d3bfbe33853a
base: de2f27a476f0ab1dc54c8a67258cdd5b4b0fa762
mode: fast
createdAt: 2026-10-04T00:42:32.759Z
isFinalized: true
groups: 66
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: fd1abe58ba8
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fd1abe58ba8-1 - ignored - structured-logging-not-console - packages/apps/composer-app/src/vite/channel-branding.ts:161
- fd1abe58ba8-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150
- fd1abe58ba8-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366
- fd1abe58ba8-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390
- fd1abe58ba8-5 - ignored - error-messages-carry-context - packages/sdk/app-toolkit/src/app/NativePasskey.ts:297

## Issues

# WARN fd1abe58ba8-1 structured-logging-not-console `packages/apps/composer-app/src/vite/channel-branding.ts:161`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 161-171 (`return;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN fd1abe58ba8-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 150-173 (`useEffect(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN fd1abe58ba8-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 366-389 (`setPrimary={setLoginPrimary}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN fd1abe58ba8-4 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 390-413 (`style={{`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN fd1abe58ba8-5 error-messages-carry-context `packages/sdk/app-toolkit/src/app/NativePasskey.ts:297`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 297-308 (`throw new Error('Unsupported negative integer size');`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `de2f27a476f0ab1dc54c8a67258cdd5b4b0fa762`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 116 uncertain, 218 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 191 (77 verdicts re-asked with context the model requested)
estimated input tokens: 1490161
billed input tokens: 1456084 (cost $0.0612)
measured chars per token: 3.07
```
