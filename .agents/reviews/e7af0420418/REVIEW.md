---
branch: claude/inbox-plugin-email-b7d6b3
commit: e7af042041843e254ef15d26faec4ef7fb3951a9
base: 6a5d3a1d802bb607155258058e3aa562f85d99a3
mode: fast
createdAt: 2026-10-01T16:35:25.357Z
isFinalized: true
groups: 205
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: e7af0420418
---

_5 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e7af0420418-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- e7af0420418-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:186
- e7af0420418-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:518
- e7af0420418-4 - ignored - story-for-new-ui-component - packages/plugins/plugin-deck/src/containers/DetailCompanion/DetailCompanion.tsx:20
- e7af0420418-5 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/index.ts:1
- e7af0420418-6 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-deck/src/index.ts:1
- e7af0420418-7 - ignored - no-casts - packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:454
- e7af0420418-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:490
- e7af0420418-9 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:199
- e7af0420418-10 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx:79
- e7af0420418-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249
- e7af0420418-12 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250
- e7af0420418-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:100
- e7af0420418-14 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:11
- e7af0420418-15 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:440
- e7af0420418-16 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- e7af0420418-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:406
- e7af0420418-18 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- e7af0420418-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326
- e7af0420418-20 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- e7af0420418-21 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- e7af0420418-22 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts:34

## Issues

# WARN e7af0420418-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 61-72 (`actions: (_node, get) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-2 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:186`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 186-211 (`return (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:518`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 518-541 (`useEffect(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-4 story-for-new-ui-component `packages/plugins/plugin-deck/src/containers/DetailCompanion/DetailCompanion.tsx:20`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 20-31 (`export const DetailCompanion = ({ role, detail }: DetailCompanionProps) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e7af0420418-5 no-casts `packages/plugins/plugin-deck/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 1-13 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-6 namespace-export-with-internal-hiding `packages/plugins/plugin-deck/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as DeckPlugin from './DeckPlugin.ts';`, location confidence 1.00). Judged with added `imports, public-api, siblings` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# ERROR e7af0420418-7 no-casts `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:454`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 454-465 (`const feedEvents = get(db.query(Query.select(Filter.type(Event.Event)).from(f...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:490`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 490-501 (`if (!binding) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-9 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:199`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 199-210 (`<div role={role} className='@container dx-expand'>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-10 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 79-90 (`[db, invokePromise],`, location confidence 0.64). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 249-272 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-12 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:100`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 100-111 (`AppGraphNode.makeAction({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e7af0420418-14 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:11`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 11-14 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-15 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:440`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 440-457 (`if (!chat) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-16 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 122-133 (`const fiber = Effect.runFork(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:406`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 406-417 (`data: () =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-18 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-19 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 326-337 (`chrome, so render the bare list under its own filter row — a nested Panel/scr...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e7af0420418-20 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 206-217 (`}`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e7af0420418-21 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e7af0420418-22 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 34-45 (`export const openObject = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6a5d3a1d802bb607155258058e3aa562f85d99a3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 22 violations written to fragments, 331 uncertain, 1792 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 907 (223 verdicts re-asked with context the model requested)
estimated input tokens: 7465671
billed input tokens: 6935828 (cost $0.2913)
measured chars per token: 3.23
```

### Resolutions

- e7af0420418-1: Pre-existing `actions` builder on the root node; this PR does not change it.
- e7af0420418-2: Pre-existing story layout; this PR does not touch those lines.
- e7af0420418-3: Pre-existing story effect; this PR does not touch those lines.
- e7af0420418-4: DetailCompanion has no visual state of its own: it resolves the detail node and renders that node's Article surface. The Deck story's launcher drives detail opens.
- e7af0420418-5: `ComponentType<any>` annotates the repo's lazy-container export pattern; it is not a cast.
- e7af0420418-6: This PR removed a wildcard (`./seed`); the remaining `#meta`/`#types` re-exports pre-date it.
- e7af0420418-7: Pre-existing query in the inbox graph builder; not changed here.
- e7af0420418-8: Pre-existing connector code; not changed here.
- e7af0420418-9: Pre-existing wrapper div; not changed here.
- e7af0420418-10: A one-off effect that expands the event node's actions; nothing reusable to extract.
- e7af0420418-11: Pre-existing `items` derivation; not changed here.
- e7af0420418-12: Pre-existing effect; this PR only resolved a merge conflict in the dependency list nearby.
- e7af0420418-13: Pre-existing action; not changed here.
- e7af0420418-14: `ComponentType<any>` annotates the lazy-container export pattern; it is not a cast. This PR only removed a neighbouring export.
- e7af0420418-15: Pre-existing story error; not changed here.
- e7af0420418-16: Pre-existing fiber management; not changed here.
- e7af0420418-17: Pre-existing collection action; this PR only removed `collectionDeck`.
- e7af0420418-18: Pre-existing drop area markup; not changed here.
- e7af0420418-19: Pre-existing list layout; not changed here.
- e7af0420418-20: The `as any` is in pre-existing icon resolution in `makeObject`, not in the new `getTypeLabel`.
- e7af0420418-21: Pre-existing `deckCompanion` role helper; this PR only added a field to `CardMasonryData`.
- e7af0420418-22: `openObject` is now an `Effect.fnUntraced` whose pipeable logs and ignores the failure.
