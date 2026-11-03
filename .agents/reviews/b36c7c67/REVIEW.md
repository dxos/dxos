---
branch: dm/compassionate-wozniak-dxx8fw
commit: b36c7c67ca5576ef0d71cf73cfb4b7da69542524
base: 0d3b47bc4d414081424b5daa11d76558f65af3bf
mode: fast
createdAt: 2026-11-03T13:41:45.510Z
isFinalized: true
groups: 87
rules: [effect-fn-not-hand-wrapped-gen, keep-parallel-apis-structurally-aligned, reactive-state-via-atom-bridge]
reviewId: b36c7c67
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b36c7c67-1 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-cloudflare-os/src/Account.ts:21
- b36c7c67-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/Account.ts:45
- b36c7c67-3 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:58

## Issues

# WARN b36c7c67-1 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-cloudflare-os/src/Account.ts:21`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.84. The likeliest place is lines 21-30 (`export const fromConnection: (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `fromConnection` and `openWorkspace` now share one shape (an annotated `Effect.fnUntraced`); `fromConnectionRef` and `open` are one-expression pipes that delegate to them.

# WARN b36c7c67-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/Account.ts:45`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 45-56 (`export const openWorkspace = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b36c7c67-3 reactive-state-via-atom-bridge `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:58`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 58-69 (`setError(undefined);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0d3b47bc4d414081424b5daa11d76558f65af3bf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 185 uncertain, 168 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 227 (108 verdicts re-asked with context the model requested)
estimated input tokens: 1136243
billed input tokens: 1071391 (cost $0.0450)
measured chars per token: 3.18
```
