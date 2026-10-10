---
branch: claude/composer-passkey-login-hang-972d01
commit: b40c7dca7f358e18162488d7d70b0b62b93ec483
base: 8412f8b2775142a1b4e6d286c54d99d75c309a15
mode: fast
createdAt: 2026-10-02T20:42:59.490Z
isFinalized: true
groups: 69
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: b40c7dca7f3
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b40c7dca7f3-1 - ignored - no-casts - packages/apps/composer-app/src/functions/_worker.test.ts:21
- b40c7dca7f3-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:151
- b40c7dca7f3-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:367
- b40c7dca7f3-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863
- b40c7dca7f3-5 - ignored - error-messages-carry-context - packages/sdk/app-toolkit/src/app/NativePasskey.ts:281

## Issues

# ERROR b40c7dca7f3-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-34 (`const archive = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b40c7dca7f3-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:151`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 151-174 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b40c7dca7f3-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:367`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 367-390 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b40c7dca7f3-4 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 863-886 (`const InlineForm = ({`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b40c7dca7f3-5 error-messages-carry-context `packages/sdk/app-toolkit/src/app/NativePasskey.ts:281`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 281-292 (`throw new Error('Unsupported negative integer size');`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8412f8b2775142a1b4e6d286c54d99d75c309a15`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 175 uncertain, 227 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 249 (108 verdicts re-asked with context the model requested)
estimated input tokens: 1973301
billed input tokens: 1877162 (cost $0.0788)
measured chars per token: 3.15
```
