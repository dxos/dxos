---
branch: dm/compassionate-wozniak-dxx8fw
commit: a38962b35896f473f82fc7690a99b0cd7658b1ac
base: 0d3b47bc4d414081424b5daa11d76558f65af3bf
mode: fast
createdAt: 2026-11-03T13:55:46.595Z
isFinalized: true
groups: 87
rules: [effect-fn-not-hand-wrapped-gen, keep-parallel-apis-structurally-aligned, reactive-state-via-atom-bridge]
reviewId: a38962b3
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a38962b3-1 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-cloudflare-os/src/Account.ts:21
- a38962b3-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/agent/CloudflareOsAgent.ts:234
- a38962b3-3 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61

## Issues

# WARN a38962b3-1 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-cloudflare-os/src/Account.ts:21`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 21-30 (`export const fromConnection: (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN a38962b3-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/agent/CloudflareOsAgent.ts:234`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 234-245 (`const respond = ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN a38962b3-3 reactive-state-via-atom-bridge `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 61-72 (`setError(undefined);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0d3b47bc4d414081424b5daa11d76558f65af3bf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 191 uncertain, 162 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 234 (115 verdicts re-asked with context the model requested)
estimated input tokens: 1221231
billed input tokens: 1149868 (cost $0.0483)
measured chars per token: 3.19
```
