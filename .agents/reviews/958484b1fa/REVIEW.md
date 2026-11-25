---
branch: claude/bundle-catalog-hooks
commit: 958484b1fa015179da571169082057bc96239dbc
base: ab300771b26a09774b283e6e70f038d9d8ff5bd9
mode: fast
createdAt: 2026-11-25T15:57:37.329Z
isFinalized: true
groups: 79
rules: [no-try-catch-in-effect-code, use-context-scoped-cancellation]
reviewId: 958484b1fa
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 958484b1fa-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:58
- 958484b1fa-2 - ignored - use-context-scoped-cancellation - packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:108

## Issues

# WARN 958484b1fa-1 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:58`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 58-69 (`const serializeOperations = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 958484b1fa-2 use-context-scoped-cancellation `packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:108`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 108-119 (`const InspectHandler = Inspect.pipe(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ab300771b26a09774b283e6e70f038d9d8ff5bd9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 123 uncertain, 105 clean, 0 unanswered
- left for an agentic reviewer: 62 batch(es)

```text
requests: 145 (78 verdicts re-asked with context the model requested)
estimated input tokens: 1244143
billed input tokens: 1204924 (cost $0.0506)
measured chars per token: 3.10
```
