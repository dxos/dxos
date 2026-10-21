---
branch: HEAD
commit: 398479c002133cfe8ccc5514cc04ac61ebb76721
base: ed0d36747afa04dcee36234c383eb98e5902db36
mode: fast
createdAt: 2026-10-20T09:30:28.908Z
isFinalized: true
groups: 77
rules: [effect-fn-not-hand-wrapped-gen, no-try-catch-in-effect-code]
reviewId: 398479c0
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 398479c0-1 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/core/url-loader.ts:75
- 398479c0-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/url-loader.ts:319

## Issues

# WARN 398479c0-1 no-try-catch-in-effect-code `packages/sdk/app-framework/src/core/url-loader.ts:75`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 75-86 (`const getPersistedRemotePlugins = (storage: Storage, key: string): RemotePlug...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 398479c0-2 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/url-loader.ts:319`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 319-330 (`export const preload = (options: PreloadOptions = {}): Effect.Effect<Plugin.P...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ed0d36747afa04dcee36234c383eb98e5902db36`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 58 uncertain, 43 clean, 0 unanswered
- left for an agentic reviewer: 53 batch(es)

```text
requests: 61 (45 verdicts re-asked with context the model requested)
estimated input tokens: 622894
billed input tokens: 599291 (cost $0.0252)
measured chars per token: 3.12
```
