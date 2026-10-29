---
branch: dm/zealous-brown-atvrov
commit: 99939adde7a1e3ebbc84492aa35c9f21a2f8c982
base: fc5e071ef36c8be980e7589076a0e118092bfb41
mode: fast
createdAt: 2026-10-29T09:15:37.060Z
isFinalized: true
groups: 82
rules: [effect-fn-not-hand-wrapped-gen, no-casts, no-try-catch-in-effect-code, use-context-scoped-cancellation]
reviewId: 99939add
---

_1 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 99939add-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/RemoteTraceMonitor.ts:73
- 99939add-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/sync/pending-monitor.ts:35
- 99939add-3 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22
- 99939add-4 - ignored - use-context-scoped-cancellation - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.ts:193

## Issues

# WARN 99939add-1 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/RemoteTraceMonitor.ts:73`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 73-84 (`export const createSwarmRemoteTraceMonitor = ({ subscribe }: SwarmRemoteTrace...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99939add-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/sync/pending-monitor.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 35-46 (`export const withPendingSyncMonitor = <A, E, R>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 99939add-3 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 22-28 (`const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, me...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99939add-4 use-context-scoped-cancellation `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.ts:193`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 193-204 (`entry.stall = undefined;`, location confidence 0.39). Judged with added `diff, importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fc5e071ef36c8be980e7589076a0e118092bfb41`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 157 uncertain, 160 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 187 (97 verdicts re-asked with context the model requested)
estimated input tokens: 1444265
billed input tokens: 1357243 (cost $0.0570)
measured chars per token: 3.19
```
