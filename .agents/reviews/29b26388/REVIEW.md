---
branch: worktree-agent-acd286e53fb36509d
commit: 29b2638879b174621606c2bf8379b903797d7360
base: e1d098457349080fa832b6b0356c894aa6fbf209
mode: fast
createdAt: 2026-10-09T04:31:38.551Z
isFinalized: true
groups: 114
rules: [bounded-live-state, comment-hygiene, effect-fn-not-hand-wrapped-gen, flat-layer-composition, test-real-scenario-not-narrower-proxy]
reviewId: 29b26388
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 29b26388-1 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:140
- 29b26388-2 - unresolved - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:65
- 29b26388-3 - unresolved - bounded-live-state - packages/plugins/plugin-agent/src/brain/BrainMemory.ts:112
- 29b26388-4 - unresolved - comment-hygiene - packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72
- 29b26388-5 - unresolved - flat-layer-composition - packages/plugins/plugin-agent/src/operations/triggers.test.ts:311
- 29b26388-6 - unresolved - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:565

## Issues

# WARN 29b26388-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 140-151 (`const openPrivateChat = (peer: Peer, agentId: string) =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29b26388-2 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:65`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 65-68 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 29b26388-3 bounded-live-state `packages/plugins/plugin-agent/src/brain/BrainMemory.ts:112`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 112-123 (`const enqueue = (events: readonly Evaluator.Event[]): number => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29b26388-4 comment-hygiene `packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 72-81 (`AgentStateRoot.displayName = 'AgentState.Root';`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29b26388-5 flat-layer-composition `packages/plugins/plugin-agent/src/operations/triggers.test.ts:311`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 311-326 (`Organization.Organization,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29b26388-6 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:565`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 565-593 (`toolCall(Operation.toolName(TriggerOperation.WatchFacts), {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e1d098457349080fa832b6b0356c894aa6fbf209`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 126 uncertain, 783 clean, 0 unanswered
- left for an agentic reviewer: 53 batch(es)

```text
requests: 379 (91 verdicts re-asked with context the model requested)
estimated input tokens: 3035553
billed input tokens: 2833822 (cost $0.1190)
measured chars per token: 3.21
```
