---
branch: worktree-agent-a8ed8e2fc33f2c958
commit: 28d85248046eadcebf17b268848d11090a16a9e9
base: 37b0196fc53df4866dc1494e3a180ca38d118da2
mode: fast
createdAt: 2026-10-08T07:15:54.320Z
isFinalized: true
groups: 101
rules: [namespace-brand-key-prefixing, reactive-state-via-atom-bridge, story-for-new-ui-component, use-context-scoped-cancellation]
reviewId: 28d85248
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 28d85248-1 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/BrainStore/BrainStore.tsx:19
- 28d85248-2 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useBrainStore.ts:41
- 28d85248-3 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useBrainStore.ts:53
- 28d85248-4 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/types/AgentCompanion.ts:1

## Issues

# WARN 28d85248-1 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/BrainStore/BrainStore.tsx:19`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 19-25 (`export const BrainStore = ({ role, agent }: BrainStoreProps) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 28d85248-2 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useBrainStore.ts:41`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 41-52 (`setError(undefined);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 28d85248-3 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useBrainStore.ts:53`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 53-64 (`{ spaceId: db.spaceId, ...(remote ? { on: 'edge' as const } : {}) },`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 28d85248-4 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/types/AgentCompanion.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.89. The likeliest place is lines 1-15 (`export const BRAIN = 'brain';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `37b0196fc53df4866dc1494e3a180ca38d118da2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 96 uncertain, 658 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 315 (72 verdicts re-asked with context the model requested)
estimated input tokens: 1456567
billed input tokens: 1335980 (cost $0.0561)
measured chars per token: 3.27
```

### Dismissals

- 28d85248-1: the container is a two-line wrapper over `components/BrainStore`, whose `BrainStore.stories.tsx` covers every visual state (Facts, Rules, MatchingFormat, Outbox, Empty, Loading, Failed); a container story would only add the client the rule says not to drag in.
- 28d85248-2: the snapshot is polled from an operation (an EDGE RPC for remote agents) with no change feed to bridge into an atom; it follows the same poll as `useTriggers` in this package.
- 28d85248-3: the timer is cleared in the effect's cleanup on unmount, which is the owning scope here; a React component has no `Context` to schedule through.
- 28d85248-4: `AgentCompanion` constants are companion variant names matched as surface literals, not type brands or annotation keys, beside the existing `brain`/`activity` variants.
