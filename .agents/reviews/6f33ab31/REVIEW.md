---
branch: dm/cool-babbage-13ak6p
commit: 6f33ab319854cc17d4597b3c468118e63c161881
base: 0bf1ac1cc8d942a3eee25a9db8718722b555ab6d
mode: fast
createdAt: 2026-11-13T18:55:37.302Z
isFinalized: true
groups: 205
rules: [containers-share-core-hooks, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, event-handler-naming-convention, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, leaf-objects-render-as-cards, namespace-export-with-internal-hiding, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, one-changeset-per-pr]
reviewId: 6f33ab31
---

_2 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6f33ab31-1 - resolved - one-changeset-per-pr - .changeset/scripted-scene.md:1
- 6f33ab31-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/ai/src/testing/ScriptedLanguageModel.ts:322
- 6f33ab31-3 - resolved - errors-extend-base-error - packages/core/compute/ai/src/testing/ScriptedScene.ts:121
- 6f33ab31-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/testing/ScriptedScene.ts:406
- 6f33ab31-5 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:151
- 6f33ab31-6 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:454
- 6f33ab31-7 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:598
- 6f33ab31-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/ChatPlane.ts:1
- 6f33ab31-9 - ignored - containers-share-core-hooks - packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:130
- 6f33ab31-10 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:394
- 6f33ab31-11 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:582
- 6f33ab31-12 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-assistant/src/index.ts:1
- 6f33ab31-13 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-dev-shell/src/ComposerPluginTemplate.ts:1
- 6f33ab31-14 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-dev-shell/src/index.ts:1
- 6f33ab31-15 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-dev-shell/src/index.ts:1
- 6f33ab31-16 - ignored - event-handler-naming-convention - packages/stories/stories-assistant/fixtures/world-clock/src/plugin.tsx:87
- 6f33ab31-17 - ignored - no-trivial-wrappers-over-official-apis - packages/stories/stories-assistant/src/scripts/build-plugin.ts:66
- 6f33ab31-18 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:461

## Triage

- 1, 2, 3: fixed — one changeset naming one package per fixed group; `nextTurn` is `Effect.fnUntraced`; `UnboundPlaceholder` extends `BaseError.extend`.
- 4: the `try` is in the scene's synchronous turn generator, not Effect code; it turns an unbound placeholder into the scripted model's failure report.
- 5, 6, 7, 9, 10: lines this PR does not change.
- 8, 12, 13, 14, 15: each namespace module has the directive, a capital-case filename and an `export * as Name` re-export, the shape the rule asks for; `export * from '#types'` predates this PR.
- 11: `ChatPlane.Cell` frames a column of the plane, not a leaf object in a container.
- 16: `onSelect` / `onDelete` follow the established convention.
- 17: `bash` adds a conditional default (`timeout`), which the rule exempts.
- 18: `Obj.setParent` there predates this PR.

## Issues

# WARN 6f33ab31-1 one-changeset-per-pr `.changeset/scripted-scene.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.96. This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/ai/src/testing/ScriptedLanguageModel.ts:322`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 322-333 (`const nextTurn = (options: LanguageModel.ProviderOptions) =>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6f33ab31-3 errors-extend-base-error `packages/core/compute/ai/src/testing/ScriptedScene.ts:121`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 121-136 (`const { kind, name, source: own } = parsePlaceholder(match[1]);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-4 no-try-catch-in-effect-code `packages/core/compute/ai/src/testing/ScriptedScene.ts:406`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 406-417 (`return failure(`Conversation "${name}": ${error instanceof Error ? error.mess...`, location confidence 0.66). Judged with added `test` context after a first pass of 0.65. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6f33ab31-5 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:151`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 151-177 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-6 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:454`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 454-477 (`Effect.provide(this._conversation.getTools(), ToolExecutionServices).pipe(Eff...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-7 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:598`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 598-621 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/ChatPlane.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-19 (`import { ChatPlane as ChatPlaneParts } from './components/ChatPlane/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-9 containers-share-core-hooks `packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:130`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.80. The likeliest place is lines 130-153 (`const ChatPlaneRoot = ({ classNames, value, onValueChange, onAdd, onMove, chi...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-10 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:394`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 394-417 (`const itemProps = useCallback((id: string) => selection.bind(id).rowProps, [s...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-11 leaf-objects-render-as-cards `packages/plugins/plugin-assistant/src/components/ChatPlane/ChatPlane.tsx:582`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.94. The likeliest place is lines 582-605 (`const ChatPlaneCell = ({ menu, title, children }: ChatPlaneCellProps) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-12 namespace-export-with-internal-hiding `packages/plugins/plugin-assistant/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-13 (`export * as AssistantPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-13 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-dev-shell/src/ComposerPluginTemplate.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-8 (`export { FOLDER, MANIFEST_URL, variant } from './templates/composer-plugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-14 namespace-export-with-internal-hiding `packages/plugins/plugin-dev-shell/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as ComposerPluginTemplate from './ComposerPluginTemplate.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-15 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-dev-shell/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`export * as ComposerPluginTemplate from './ComposerPluginTemplate.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-16 event-handler-naming-convention `packages/stories/stories-assistant/fixtures/world-clock/src/plugin.tsx:87`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 87-94 (`type ClockCardProps = {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-17 no-trivial-wrappers-over-official-apis `packages/stories/stories-assistant/src/scripts/build-plugin.ts:66`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.88. The likeliest place is lines 66-69 (`const bash = (script: string, timeout?: number) =>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f33ab31-18 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:461`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 461-472 (`Obj.setParent(agent, project);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0bf1ac1cc8d942a3eee25a9db8718722b555ab6d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 248 uncertain, 1036 clean, 0 unanswered
- left for an agentic reviewer: 93 batch(es)

```text
requests: 564 (123 verdicts re-asked with context the model requested)
estimated input tokens: 4513035
billed input tokens: 4270560 (cost $0.1794)
measured chars per token: 3.17
```
