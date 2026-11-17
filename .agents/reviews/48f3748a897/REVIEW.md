---
branch: dm/discord-extraction
commit: 48f3748a8979a06e537559858b604833ef7ec2dd
base: 120e49fb7274eaac1bebe6dfde275df02c4b6338
mode: fast
createdAt: 2026-11-17T11:35:17.223Z
isFinalized: true
groups: 169
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, no-unused-new-api, reactive-state-via-atom-bridge, story-for-new-ui-component, structured-logging-not-console, toolbars-are-menu-actions]
reviewId: 48f3748a897
---

_1 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 48f3748a897-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:92
- 48f3748a897-2 - ignored - no-casts - packages/plugins/plugin-brain/src/containers/index.ts:1
- 48f3748a897-3 - ignored - no-unused-new-api - packages/plugins/plugin-brain/src/containers/index.ts:1
- 48f3748a897-4 - ignored - story-for-new-ui-component - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:32
- 48f3748a897-5 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:40
- 48f3748a897-6 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:112
- 48f3748a897-7 - ignored - empty-container-uses-empty - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:169
- 48f3748a897-8 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:202
- 48f3748a897-9 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/use-query-log.ts:10
- 48f3748a897-10 - ignored - story-for-new-ui-component - packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:28
- 48f3748a897-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:36
- 48f3748a897-12 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:36
- 48f3748a897-13 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:84
- 48f3748a897-14 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:84
- 48f3748a897-15 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/fact-server.ts:69
- 48f3748a897-16 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/facts-cli.ts:102

## Issues

# WARN 48f3748a897-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 92-103 (`export const make = (baseUrl: string): FactStoreApi => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48f3748a897-2 no-casts `packages/plugins/plugin-brain/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 1-11 (`import { type ComponentType } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-3 no-unused-new-api `packages/plugins/plugin-brain/src/containers/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.80. The likeliest place is lines 1-11 (`import { type ComponentType } from 'react';`, location confidence 1.00). Judged with added `diff, importers, public-api` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-4 story-for-new-ui-component `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:32`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 32-39 (`export const MemoryArticle = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-5 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:40`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 40-51 (`const MemoryPanel = ({ registry, spaceId }: { registry: FactStoreRegistry; sp...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-6 toolbars-are-menu-actions `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:112`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 112-123 (`label={t('memory-import.button')}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-7 empty-container-uses-empty `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:169`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.88. The likeliest place is lines 169-180 (`{entries.length === 0 ? (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-8 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 202-213 (`<div className='flex items-center gap-2 text-sm text-description'>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-9 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/use-query-log.ts:10`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 10-15 (`export const useQueryLog = (registry: FactStoreRegistry, spaceId: string): re...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-10 story-for-new-ui-component `packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:28`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 28-35 (`export const PipelineCompanion = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:36`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 36-47 (`const PipelinePanel = ({ registry, spaceId }: { registry: FactStoreRegistry; ...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-12 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:36`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.90. The likeliest place is lines 36-47 (`const PipelinePanel = ({ registry, spaceId }: { registry: FactStoreRegistry; ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-13 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 84-95 (`[t('pipeline-last.label'), moment(sum.last)],`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-14 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-brain/src/containers/PipelineCompanion/PipelineCompanion.tsx:84`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 84-95 (`[t('pipeline-last.label'), moment(sum.last)],`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-15 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/fact-server.ts:69`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 69-80 (`const previous = current;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48f3748a897-16 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/facts-cli.ts:102`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 102-106 (`console.log(line(row));`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `120e49fb7274eaac1bebe6dfde275df02c4b6338`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 187 uncertain, 1009 clean, 0 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 502 (113 verdicts re-asked with context the model requested)
estimated input tokens: 2834442
billed input tokens: 2647454 (cost $0.1112)
measured chars per token: 3.21
```

### Triage

- 1 effect-fn-not-hand-wrapped-gen: `FactStoreHttp.make` returns a store object, not an Effect; the only new lines are two delegating methods.
- 2 no-casts: `ComponentType<any>` is the file's existing lazy-container annotation (FactsCompanion uses it); no cast is added.
- 3 no-unused-new-api: both lazy containers are used by `capabilities/react-surface.ts`.
- 4, 10 story-for-new-ui-component: the Memory and Pipeline panels are exercised end to end by `autocue/memory-findings.mjs` (QA-2) in Composer; stories are a follow-up named in the PR.
- 5, 9, 12 reactive-state-via-atom-bridge: the fact-store registry is a plain subscription source (as `useFacts` already reads it); moving it to atoms is a registry change, not part of this PR.
- 6 toolbars-are-menu-actions: follow-up named in the PR; the Import/Export buttons need a file chooser and a download, which the view owns.
- 7 empty-container-uses-empty: the line is a hint inside the history strip, not an empty container.
- 8, 13 no-styling-wrapper-divs and 14 design-tokens-not-raw-spacing-sizing: follow-up named in the PR; the canvas needs a definite height to fit its scene.
- 11 extract-non-rendering-logic-from-component: reading and decoding live in `pipeline.ts`; the component only subscribes.
- 15, 16 structured-logging-not-console: both are CLIs whose stdout is their output.
