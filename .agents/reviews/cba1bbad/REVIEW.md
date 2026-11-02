---
branch: worktree-mdl-spec-ide
commit: cba1bbad6ea6abfcc650053ae1af30dfabd1a860
base: b4798aa596ad625db586725cc0646b77f630238b
mode: fast
createdAt: 2026-10-23T09:10:59.130Z
isFinalized: true
groups: 253
rules: [atom-lifetime-bound-to-owner, bounded-live-state, business-logic-out-of-ui, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, no-module-level-object-caches, no-styling-wrapper-divs, no-try-catch-in-effect-code, reactive-state-via-atom-bridge, story-for-new-ui-component, subscribe-where-you-read, toolbars-are-menu-actions]
reviewId: cba1bbad
---

_1 error(s), 19 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cba1bbad-1 - resolved - bounded-live-state - packages/apps/composer-app/src/vite/file-system.ts:22
- cba1bbad-2 - resolved - no-module-level-object-caches - packages/apps/composer-app/src/vite/file-system.ts:22
- cba1bbad-3 - resolved - inject-dependencies-via-constructor - packages/apps/composer-app/src/vite/file-system.ts:22
- cba1bbad-4 - resolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-code/src/capabilities/spec-sync.ts:33
- cba1bbad-5 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:77
- cba1bbad-6 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:101
- cba1bbad-7 - resolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.stories.tsx:28
- cba1bbad-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:81
- cba1bbad-9 - resolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.stories.tsx:20
- cba1bbad-10 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.stories.tsx:38
- cba1bbad-11 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.tsx:44
- cba1bbad-12 - ignored - subscribe-where-you-read - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:106
- cba1bbad-13 - ignored - business-logic-out-of-ui - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:202
- cba1bbad-14 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:238
- cba1bbad-15 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:34
- cba1bbad-16 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/sync/repo-roots.ts:31
- cba1bbad-17 - resolved - no-try-catch-in-effect-code - packages/plugins/plugin-code/src/sync/spec-sync.ts:58
- cba1bbad-18 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/sync/spec-sync.ts:88
- cba1bbad-19 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/types/CodeOperation.ts:1
- cba1bbad-20 - resolved - error-messages-carry-context - packages/plugins/plugin-file-system/src/types/FileSystem.ts:101

## Issues

# ERROR cba1bbad-1 bounded-live-state `packages/apps/composer-app/src/vite/file-system.ts:22`

Resolution: The remote cache moved from module scope into `fileSystemPlugin`, one entry per configured root built once, so it is bounded and owned by the plugin instance.

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 22-28 (`const remoteOf = (dir: string): string | undefined => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-2 no-module-level-object-caches `packages/apps/composer-app/src/vite/file-system.ts:22`

Resolution: The remote cache moved from module scope into `fileSystemPlugin`, one entry per configured root built once, so it is bounded and owned by the plugin instance.

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.80. The likeliest place is lines 22-28 (`const remoteOf = (dir: string): string | undefined => {`, location confidence 0.61). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-3 inject-dependencies-via-constructor `packages/apps/composer-app/src/vite/file-system.ts:22`

Resolution: The remote cache moved from module scope into `fileSystemPlugin`, one entry per configured root built once, so it is bounded and owned by the plugin instance.

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.84. The likeliest place is lines 22-28 (`const remoteOf = (dir: string): string | undefined => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-4 atom-lifetime-bound-to-owner `packages/plugins/plugin-code/src/capabilities/spec-sync.ts:33`

Resolution: Replaced `Atom.keepAlive` with a `registry.mount` acquired in the capability module's scope, so the state atom lives exactly as long as the module.

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.96. The likeliest place is lines 33-44 (`const bases = new SyncBases();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-5 story-for-new-ui-component `packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:77`

Resolution: Added `CodeView.stories.tsx` (default, symbol not found, loading, no checkout); no existing story rendered CodeView.

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 77-88 (`export const CodeView = ({ label, path, content, symbol, error, onOpenExterna...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-6 toolbars-are-menu-actions `packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:101`

Resolution: False positive: CodeView is a presentational component that takes its one action as a prop, which the rule exempts; the container toolbar in SpecArticle is a separate surface.

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 101-112 (`)}`, location confidence 0.88). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-7 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.stories.tsx:28`

Resolution: Story frame now uses the `w-(--dx-complementary-sidebar-size)` token instead of `w-[28rem] h-[48rem]`; the column layout already fills the height.

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 28-40 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:81`

Resolution: False positive: a one-line memo over the already-extracted pure `buildChangelogGraph`, not a filter/query or resource lifecycle.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 81-92 (`const decisions = useMemo(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-9 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.stories.tsx:20`

Resolution: Story frame now uses the `w-card-default-width` token instead of `w-[24rem]`.

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 20-32 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-10 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.stories.tsx:38`

Resolution: Replaced the hand-rolled `<div className='flex flex-col gap-2'>` with `Layout.Flex column gap='sm'`.

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const EveryStatus: Story = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-11 story-for-new-ui-component `packages/plugins/plugin-code/src/components/VerdictCard/VerdictCard.tsx:44`

Resolution: False positive: `VerdictCard.stories.tsx` already exists beside the component.

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.96. The likeliest place is lines 44-55 (`export const VerdictCard = Util.composable<HTMLDivElement, VerdictCardProps>(`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-12 subscribe-where-you-read `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:106`

Resolution: False positive: the content ref is subscribed with `useObject(spec?.content)`, `spec.id` is immutable, and the meta key is set at import rather than edited live.

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 106-117 (`export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-13 business-logic-out-of-ui `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:202`

Resolution: False positive: the cited `open` callback invokes the `ImportSpec` and `LayoutOperation.Open` operations rather than implementing sync itself, which is what the rule asks for.

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 202-213 (`return;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-14 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:238`

Resolution: False positive: memoizing the CodeMirror extension list is render configuration, not a filter/query or resource lifecycle.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 238-249 (`const extensions = useMemo(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-15 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:34`

Resolution: Out of scope: moving the polled `useLocalTexts` to an atom family keyed by file set is a redesign of the hook and its callers, not a local fix.

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 34-45 (`export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, s...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-16 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/sync/repo-roots.ts:31`

Resolution: `detectRepo` (and the sibling `resolveRoots`) now use `Effect.fnUntraced` instead of a hand-wrapped `Effect.gen`.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 31-42 (`export const detectRepo = (fs: FileSystem.FileSystem, path: string): Effect.E...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-17 no-try-catch-in-effect-code `packages/plugins/plugin-code/src/sync/spec-sync.ts:58`

Resolution: `SyncBases.get`/`set` now return Effects and wrap `localStorage` with `Effect.try` + `orElseSucceed` instead of try/catch.

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 58-69 (`export class SyncBases {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-18 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/sync/spec-sync.ts:88`

Resolution: `syncSpec` now uses `Effect.fnUntraced` with the error fallback passed as a pipeable.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 88-99 (`export const syncSpec = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-19 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/types/CodeOperation.ts:1`

Resolution: False positive: `CodeOperation.ts` has the directive, a matching filename, a same-name barrel re-export, unprefixed members, and only namespace imports.

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-15 (`import * as Schema from 'effect/Schema';`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN cba1bbad-20 error-messages-carry-context `packages/plugins/plugin-file-system/src/types/FileSystem.ts:101`

Resolution: The dev-route errors now carry the method and request URL (`GET /__dx/fs/file?path=…`) alongside the status.

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 101-112 (`const devFileSystem = (): FileSystem => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b4798aa596ad625db586725cc0646b77f630238b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 20 violations written to fragments, 291 uncertain, 1726 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 849 (176 verdicts re-asked with context the model requested)
estimated input tokens: 4653803
billed input tokens: 4311053 (cost $0.1811)
measured chars per token: 3.24
```
