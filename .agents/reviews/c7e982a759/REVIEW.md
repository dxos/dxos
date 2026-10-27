---
branch: dm/agent-13-oct-x8ehi8
commit: c7e982a759d4964b3971abcb36d08dc48f04d5c4
base: 743604d94e1ddda759a3d507053ddd0ba11af391
mode: fast
createdAt: 2026-10-13T16:40:41.562Z
isFinalized: true
groups: 367
rules: [comment-hygiene, effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, named-durations-and-budgets, no-try-catch-in-effect-code, obj-update-push, one-test-suite-per-module, per-test-mutable-fixtures, reactive-state-via-atom-bridge, stable-component-for-optional-content, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: c7e982a759
---

_0 error(s), 24 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c7e982a759-1 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/brain/src/Vocabulary.ts:1
- c7e982a759-2 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-query.ts:57
- c7e982a759-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/pipeline-rdf/src/internal/sparql/sparql-to-query.ts:72
- c7e982a759-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:164
- c7e982a759-5 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/pipeline.test.ts:88
- c7e982a759-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248
- c7e982a759-7 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:65
- c7e982a759-8 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:93
- c7e982a759-9 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:137
- c7e982a759-10 - ignored - comment-hygiene - packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72
- c7e982a759-11 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/components/ProfileGraph/ProfileGraph.tsx:56
- c7e982a759-12 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:128
- c7e982a759-13 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:53
- c7e982a759-14 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:65
- c7e982a759-15 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/interview.test.ts:62
- c7e982a759-16 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/modes.test.ts:90
- c7e982a759-17 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/modes.test.ts:150
- c7e982a759-18 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:68
- c7e982a759-19 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:25
- c7e982a759-20 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:102
- c7e982a759-21 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/triggers.test.ts:580
- c7e982a759-22 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:580
- c7e982a759-23 - ignored - obj-update-push - packages/stories/stories-agent/src/testing/discord.ts:112
- c7e982a759-24 - ignored - named-durations-and-budgets - packages/stories/stories-assistant/src/stories/AgentConversation.stories.tsx:68

## Issues

# WARN c7e982a759-1 import-as-namespace-is-all-or-nothing `packages/core/compute/brain/src/Vocabulary.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-9 (`import { Ontology, Predicate } from '@dxos/pipeline-rdf/types';`, location confidence 0.81). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-2 flat-layer-composition `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-query.ts:57`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 57-71 (`export const generateQuery = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-3 no-try-catch-in-effect-code `packages/core/compute/pipeline-rdf/src/internal/sparql/sparql-to-query.ts:72`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 72-83 (`export const parseSparqlToQuery = (sparql: string): SemanticQuery => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-4 no-try-catch-in-effect-code `packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:164`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 164-175 (`export const parseExtractPayload = (raw: string): ExtractPayload => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-5 flat-layer-composition `packages/core/compute/pipeline-rdf/src/pipeline.test.ts:88`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 88-92 (`const TestLayer = FactStoreLive.layer.pipe(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 248-259 (`Effect.gen(function* () {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-7 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:65`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.86. The likeliest place is lines 65-68 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-8 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:93`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.80. The likeliest place is lines 93-102 (`return { parts: [watchWork(refs, 'alice', 'Bob')] };`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-9 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:137`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.90. The likeliest place is lines 137-147 (`],`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-10 comment-hygiene `packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 72-81 (`AgentStateRoot.displayName = 'AgentState.Root';`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-11 stable-component-for-optional-content `packages/plugins/plugin-agent/src/components/ProfileGraph/ProfileGraph.tsx:56`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 56-67 (`{goals.length > 0 && (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-12 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:128`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 128-139 (`const useBoundSkills = (agent: Agent.Agent, chat: Chat.Chat | undefined): Age...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-13 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 53-64 (`const read = async () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-14 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:65`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 65-76 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-15 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/interview.test.ts:62`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.81. The likeliest place is lines 62-73 (`describe('Interview', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-16 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/modes.test.ts:90`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 90-101 (`describe('Modes', () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-17 flat-layer-composition `packages/plugins/plugin-agent/src/operations/modes.test.ts:150`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 150-161 (`expect(supportKeys).not.toContain(InterviewSkill.key);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-18 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:68`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 68-82 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-19 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 25-59 (`import { AgentOperationHandlerSet } from '#operations';`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-20 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:102`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.80. The likeliest place is lines 102-125 (`describe('toRules', () => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-21 flat-layer-composition `packages/plugins/plugin-agent/src/operations/triggers.test.ts:580`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 580-605 (`const PostedTestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-22 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:580`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 580-605 (`const PostedTestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.25). Judged with added `imports, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-23 obj-update-push `packages/stories/stories-agent/src/testing/discord.ts:112`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.94. The likeliest place is lines 112-123 (`}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c7e982a759-24 named-durations-and-budgets `packages/stories/stories-assistant/src/stories/AgentConversation.stories.tsx:68`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.82. The likeliest place is lines 68-86 (`const STEPS: ConversationStep[] = [`, location confidence 0.32). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `743604d94e1ddda759a3d507053ddd0ba11af391`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 24 violations written to fragments, 427 uncertain, 2865 clean, 0 unanswered
- left for an agentic reviewer: 100 batch(es)

```text
requests: 1322 (296 verdicts re-asked with context the model requested)
estimated input tokens: 8866391
billed input tokens: 8263907 (cost $0.3471)
measured chars per token: 3.22
```
