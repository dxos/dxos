---
branch: dm/brave-mayer-wie3tu
commit: de216730d6eb625b2dad01c7e4d23c362787de14
base: 1a7551c6040834b2ad9014ad38b727e46cb017ed
mode: fast
createdAt: 2026-10-27T10:14:05.785Z
isFinalized: true
groups: 103
rules: [atom-lifetime-bound-to-owner, effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, no-sleep-in-test, retries-via-schedule-with-evidence]
reviewId: de216730
---

_0 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- de216730-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/AcpAgent.ts:78
- de216730-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-claude/src/agents/ClaudeChoices.ts:1
- de216730-3 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:86
- de216730-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:279
- de216730-5 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:344
- de216730-6 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:329
- de216730-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:482
- de216730-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-claude/src/agents/EdgeProtocol.ts:1

## Issues

All eight are ignored. Seven point at code this PR does not touch (`AcpAgent.make`, `CodeAgent.make` and its sweep and probe, the EdgeAgent test's redelivery case, `composerMcpCredentials`, `EdgeProtocol`). `ClaudeChoices.ts` (de216730-2) meets all four parts of the namespace rule as it applies: it carries the directive, its filename is the namespace, and every importer takes the whole namespace; like `EdgeProtocol`, it is internal to the plugin, so the plugin's barrel does not re-export it.

# WARN de216730-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/AcpAgent.ts:78`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 78-89 (`static make = (options: { idleTimeout?: Duration.Input } = {}): Effect.Effect...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/agents/ClaudeChoices.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-15 (`import type { Chat } from '@dxos/assistant';`, location confidence 0.36). Judged with added `importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-3 atom-lifetime-bound-to-owner `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:86`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 86-97 (`export const make = (definition: Definition): Effect.Effect<CodeAgent, never,...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:279`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 279-290 (`const sweepWorktrees = ({`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-5 retries-via-schedule-with-evidence `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:344`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 344-355 (`const probe = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-6 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:329`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 329-340 (`if (key && key.id.endsWith(':2')) {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:482`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 482-493 (`export const composerMcpCredentials = (`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN de216730-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/agents/EdgeProtocol.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-12 (`import * as Rpc from 'effect/rpc/Rpc';`, location confidence 0.36). Judged with added `importers` context after a first pass of 0.64. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1a7551c6040834b2ad9014ad38b727e46cb017ed`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 359 uncertain, 319 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 399 (230 verdicts re-asked with context the model requested)
estimated input tokens: 3189135
billed input tokens: 3009692 (cost $0.1264)
measured chars per token: 3.18
```
