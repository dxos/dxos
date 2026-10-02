---
branch: claude/composer-passkey-login-hang-972d01
commit: 10dc0f83f6f588153afe99fdaa2087c31a6dd2f1
base: 8412f8b2775142a1b4e6d286c54d99d75c309a15
mode: fast
createdAt: 2026-10-02T20:17:20.623Z
isFinalized: true
groups: 69
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 10dc0f83f6f
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 10dc0f83f6f-1 - resolved - no-casts - packages/apps/composer-app/src/functions/_worker.test.ts:118
- 10dc0f83f6f-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/operations/redeem-passkey.ts:25
- 10dc0f83f6f-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:151
- 10dc0f83f6f-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:367
- 10dc0f83f6f-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863
- 10dc0f83f6f-6 - ignored - error-messages-carry-context - packages/sdk/app-toolkit/src/app/NativePasskey.ts:281

## Issues

# ERROR 10dc0f83f6f-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 118-125 (`{} as never,`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10dc0f83f6f-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/operations/redeem-passkey.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 25-36 (`const nativeAssertion = (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10dc0f83f6f-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:151`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 151-174 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10dc0f83f6f-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:367`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 367-390 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10dc0f83f6f-5 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 863-886 (`const InlineForm = ({`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10dc0f83f6f-6 error-messages-carry-context `packages/sdk/app-toolkit/src/app/NativePasskey.ts:281`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.92. The likeliest place is lines 281-292 (`throw new Error('Unsupported negative integer size');`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8412f8b2775142a1b4e6d286c54d99d75c309a15`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 171 uncertain, 232 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 243 (114 verdicts re-asked with context the model requested)
estimated input tokens: 1931937
billed input tokens: 1837517 (cost $0.0772)
measured chars per token: 3.15
```
