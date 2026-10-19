---
branch: dm/agent-13-oct-x8ehi8
commit: 1a78c179f22d1fadfec03260ae8dc977b2925960
base: b7fe13fb6d6c6b9954e120a25b657d99a324f0e1
mode: fast
createdAt: 2026-10-13T11:41:33.937Z
isFinalized: true
groups: 161
rules: [effect-fn-not-hand-wrapped-gen, no-casts, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, obj-update-push]
reviewId: 1a78c179
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1a78c179-1 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:462
- 1a78c179-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:13
- 1a78c179-3 - ignored - no-retries-or-skips-for-flaky-tests - packages/core/mesh/edge-client/src/edge-http-client.test.ts:17
- 1a78c179-4 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:387
- 1a78c179-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/services/bot-gateway.ts:73
- 1a78c179-6 - ignored - obj-update-push - packages/stories/stories-agent/src/testing/discord.ts:112
- 1a78c179-7 - resolved - obj-update-push - packages/stories/stories-agent/src/testing/support-team.ts:129

## Issues

# WARN 1a78c179-1 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:462`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 462-469 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a78c179-2 no-casts `packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 13-29 (`import type * as KeyValueStore from 'effect/persistence/KeyValueStore';`, location confidence 0.56). Judged with added `imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a78c179-3 no-retries-or-skips-for-flaky-tests `packages/core/mesh/edge-client/src/edge-http-client.test.ts:17`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.90. The likeliest place is lines 17-30 (`const DEV_SERVER = 'https://dev.dxos.network';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a78c179-4 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:387`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 387-398 (`const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a78c179-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/services/bot-gateway.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`export const callBotRoute = <A, I>(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a78c179-6 obj-update-push `packages/stories/stories-agent/src/testing/discord.ts:112`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.93. The likeliest place is lines 112-123 (`}`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a78c179-7 obj-update-push `packages/stories/stories-agent/src/testing/support-team.ts:129`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.94. The likeliest place is lines 129-140 (`if (existing && !existing.identities?.some(({ label }) => label === DISCORD_I...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b7fe13fb6d6c6b9954e120a25b657d99a324f0e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 185 uncertain, 862 clean, 0 unanswered
- left for an agentic reviewer: 77 batch(es)

```text
requests: 436 (125 verdicts re-asked with context the model requested)
estimated input tokens: 3148077
billed input tokens: 2958821 (cost $0.1243)
measured chars per token: 3.19
```
