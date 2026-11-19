---
branch: dm/optimistic-ritchie-7d2rhs
commit: e09add8d018965611662a922da3c006d9fca3dee
base: 120dc6cf9b0e218fb35d70338cef8e159a66e215
mode: fast
createdAt: 2026-11-19T10:33:32.498Z
isFinalized: true
groups: 72
rules: [code-not-in-strings, structured-logging-not-console, workaround-is-documented-and-removable]
reviewId: e09add8d
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e09add8d-1 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/check-release.ts:20
- e09add8d-2 - ignored - code-not-in-strings - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:98
- e09add8d-3 - resolved - workaround-is-documented-and-removable - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:241

## Issues

# WARN e09add8d-1 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/check-release.ts:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 20-31 (`const main = async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e09add8d-2 code-not-in-strings `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:98`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 98-109 (`const REQUIRE_SHIM_BANNER = [`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e09add8d-3 workaround-is-documented-and-removable `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:241`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.83. The likeliest place is lines 241-246 (`* 3. JSX dev runtime shim — bridges `react/jsx-dev-runtime` (used by React re...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `120dc6cf9b0e218fb35d70338cef8e159a66e215`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 46 uncertain, 87 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 73 (19 verdicts re-asked with context the model requested)
estimated input tokens: 584531
billed input tokens: 558342 (cost $0.0235)
measured chars per token: 3.14
```
