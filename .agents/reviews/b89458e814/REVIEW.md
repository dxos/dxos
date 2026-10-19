---
branch: dm/agent-13-oct-x8ehi8
commit: b89458e814a63dce3e7a3bb8dcd7f30cbe161f2c
base: 0507be5031c3f50e727c240a3a4ab7be1c5593bb
mode: fast
createdAt: 2026-10-16T05:50:58.434Z
isFinalized: true
groups: 214
rules: [comment-hygiene, flat-layer-composition, namespace-export-with-internal-hiding, one-test-suite-per-module, reactive-state-via-atom-bridge, stable-component-for-optional-content]
reviewId: b89458e814
---

_0 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b89458e814-1 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-rdf/src/index.ts:1
- b89458e814-2 - ignored - comment-hygiene - packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:73
- b89458e814-3 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/components/ProfileGraph/ProfileGraph.tsx:44
- b89458e814-4 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:119
- b89458e814-5 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:54
- b89458e814-6 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/interview.test.ts:62
- b89458e814-7 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/modes.test.ts:91
- b89458e814-8 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/modes.test.ts:151

## Issues

# WARN b89458e814-1 namespace-export-with-internal-hiding `packages/core/compute/pipeline-rdf/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-14 (`export * as RDF from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-2 comment-hygiene `packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:73`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 73-82 (`AgentStateRoot.displayName = 'AgentState.Root';`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-3 stable-component-for-optional-content `packages/plugins/plugin-agent/src/components/ProfileGraph/ProfileGraph.tsx:44`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.82. The likeliest place is lines 44-55 (`export const ProfileGraph = ({ goals, facts }: ProfileGraphProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-4 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:119`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 119-130 (`const useBoundSkills = (agent: Agent.Agent, chat: Chat.Chat | undefined): Age...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-5 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:54`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 54-65 (`const read = async () => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-6 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/interview.test.ts:62`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 62-73 (`describe('Interview', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-7 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/modes.test.ts:91`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 91-102 (`describe('Modes', () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b89458e814-8 flat-layer-composition `packages/plugins/plugin-agent/src/operations/modes.test.ts:151`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 151-162 (`expect(supportKeys).not.toContain(InterviewSkill.key);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- All 8 ignored: each flags a structure that predates this PR (the barrel's namespace export, `AgentState`'s section comments, `ProfileGraph`'s empty-state return, the containers' brain subscriptions, the existing `Interview`/`Modes` suites and test layers); this PR only renamed memories to facts inside them.


### System One pass

- model: jev-latest
- base for context: `0507be5031c3f50e727c240a3a4ab7be1c5593bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 228 uncertain, 1511 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 679 (138 verdicts re-asked with context the model requested)
estimated input tokens: 4587492
billed input tokens: 4239166 (cost $0.1780)
measured chars per token: 3.25
```
