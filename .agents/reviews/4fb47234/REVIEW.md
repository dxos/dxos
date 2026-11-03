---
branch: dm/compassionate-wozniak-dxx8fw
commit: 4fb472344305390f73cd8dd618858e96d299e188
base: 0d3b47bc4d414081424b5daa11d76558f65af3bf
mode: fast
createdAt: 2026-11-03T14:09:32.096Z
isFinalized: true
groups: 98
rules: [effect-fn-not-hand-wrapped-gen, no-mixed-promise-effect-lifecycle, reactive-state-via-atom-bridge, use-context-scoped-cancellation]
reviewId: 4fb47234
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4fb47234-1 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- 4fb47234-2 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- 4fb47234-3 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:102
- 4fb47234-4 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61
- 4fb47234-5 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:85

## Issues

# WARN 4fb47234-1 use-context-scoped-cancellation `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 63-71 (`export const withDeadline = <T>(promise: PromiseLike<T>, timeoutMs: number): ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `withDeadline` must be a Promise race: the start request runs inside `Effect.uninterruptible` (so a cancel learns the chat id), and an Effect timeout cannot interrupt work in that region.

# WARN 4fb47234-2 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 63-71 (`export const withDeadline = <T>(promise: PromiseLike<T>, timeoutMs: number): ...`, location confidence 0.75). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Same as 4fb47234-1: the deadline belongs to the request promise because the surrounding effect is uninterruptible.

# WARN 4fb47234-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 102-113 (`export const login = ({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fb47234-4 reactive-state-via-atom-bridge `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 61-72 (`setError(undefined);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fb47234-5 use-context-scoped-cancellation `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:85`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 85-96 (`let reconnect: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The snapshot deadline is a timer in a React effect, cleared in the effect's cleanup; there is no Effect context at that browser boundary.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0d3b47bc4d414081424b5daa11d76558f65af3bf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 222 uncertain, 226 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 283 (136 verdicts re-asked with context the model requested)
estimated input tokens: 1481823
billed input tokens: 1393837 (cost $0.0585)
measured chars per token: 3.19
```
