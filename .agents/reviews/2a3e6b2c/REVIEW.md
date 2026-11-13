---
branch: HEAD
commit: 2a3e6b2cd0edda375ebb07b95eeeb7a11382d9cb
base: d53982f39f1100d3cf8453554a6dd975247e9400
mode: fast
createdAt: 2026-11-13T08:38:14.935Z
isFinalized: true
groups: 78
rules: [no-try-catch-in-effect-code]
reviewId: 2a3e6b2c
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2a3e6b2c-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208

## Issues

# WARN 2a3e6b2c-1 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 208-219 (`const invoke: Host['invoke'] = async (request, env, scope = {}) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d53982f39f1100d3cf8453554a6dd975247e9400`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 66 uncertain, 39 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 60 (40 verdicts re-asked with context the model requested)
estimated input tokens: 681455
billed input tokens: 663420 (cost $0.0279)
measured chars per token: 3.08
```
