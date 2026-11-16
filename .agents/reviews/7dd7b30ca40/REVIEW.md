---
branch: claude/amazing-faraday-b7ee1c
commit: 7dd7b30ca40cdc522693c1317fff0293984b56e9
base: 0bf1ac1cc8d942a3eee25a9db8718722b555ab6d
mode: fast
createdAt: 2026-11-15T18:22:14.915Z
isFinalized: true
groups: 267
rules: [atom-lifetime-bound-to-owner, consistent-file-naming-within-folder, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, operations-resolve-database-from-service, retries-via-schedule-with-evidence, schema-declare-and-brand, stable-component-for-optional-content, story-for-new-ui-component, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: 7dd7b30ca40
---

_6 error(s), 21 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7dd7b30ca40-1 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-markdown/dx.config.ts:103
- 7dd7b30ca40-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1
- 7dd7b30ca40-3 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25
- 7dd7b30ca40-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55
- 7dd7b30ca40-5 - ignored - stable-component-for-optional-content - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289
- 7dd7b30ca40-6 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:325
- 7dd7b30ca40-7 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142
- 7dd7b30ca40-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178
- 7dd7b30ca40-9 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382
- 7dd7b30ca40-10 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:150
- 7dd7b30ca40-11 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:174
- 7dd7b30ca40-12 - ignored - no-casts - packages/plugins/plugin-space/src/containers/index.ts:1
- 7dd7b30ca40-13 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:36
- 7dd7b30ca40-14 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:48
- 7dd7b30ca40-15 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:52
- 7dd7b30ca40-16 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:166
- 7dd7b30ca40-17 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:107
- 7dd7b30ca40-18 - ignored - no-casts - packages/plugins/plugin-space/src/types/SpaceSchema.ts:192
- 7dd7b30ca40-19 - ignored - schema-declare-and-brand - packages/sdk/app-graph/src/AppGraph.ts:42
- 7dd7b30ca40-20 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:627
- 7dd7b30ca40-21 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:861
- 7dd7b30ca40-22 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client/src/halo/halo-proxy.ts:404
- 7dd7b30ca40-23 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- 7dd7b30ca40-24 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-attention/src/types/ViewLocation.ts:23
- 7dd7b30ca40-25 - resolved - no-sleep-in-test - packages/ui/react-ui-editor/src/hooks/useTextEditor.test.tsx:138
- 7dd7b30ca40-26 - resolved - no-sleep-in-test - packages/ui/ui-editor/src/extensions/state/location.test.ts:70
- 7dd7b30ca40-27 - ignored - use-context-scoped-cancellation - packages/ui/ui-editor/src/extensions/state/selection.ts:146

## Issues

# WARN 7dd7b30ca40-1 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-markdown/dx.config.ts:103`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.88. The likeliest place is lines 103-114 (`AppCapability.operationHandler(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-3 atom-lifetime-bound-to-owner `packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.95. The likeliest place is lines 25-36 (`return containers.length > 0 ? Notifications.countUnread(Notifications.derive...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`export const CommentsArticle = ({ attendableId, subject: data }: CommentsArti...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-5 stable-component-for-optional-content `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 289-300 (`) : anchors.length > 0 ? (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-6 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:325`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 325-336 (`<Button.Root`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-7 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 142-153 (`}`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 178-189 (`useEffect(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-9 themed-primitives-take-classNames `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.81. The likeliest place is lines 382-393 (`const grid = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-10 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:150`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.84. The likeliest place is lines 150-161 (`return;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-11 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:174`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 174-185 (`const spaceNamesSub = client.spaces.subscribe((spaces) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-12 no-casts `packages/plugins/plugin-space/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 1-48 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-13 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 36-47 (`export const MembersCompanion = () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-14 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`const byObject = new Map<EID.EID, Member[]>();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-15 consistent-file-naming-within-folder `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:52`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 52-61 (`const meta = {`, location confidence 0.55). Judged with added `package, siblings` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-16 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:166`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 166-177 (`export const Small = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-17 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:107`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.81. The likeliest place is lines 107-112 (`export type OnTypeAdded = (params: {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-18 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:192`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 192-208 (`export type CreateObject = (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-19 schema-declare-and-brand `packages/sdk/app-graph/src/AppGraph.ts:42`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.81. The likeliest place is lines 42-61 (`export type GraphTypeId = typeof GraphTypeId;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-20 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:627`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 627-650 (`export const waitForPath = (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-21 no-casts `packages/sdk/app-graph/src/AppGraph.ts:861`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 861-883 (`const stableData = (graph: GraphImpl, id: string, type: string, existing: unk...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-22 no-mixed-promise-effect-lifecycle `packages/sdk/client/src/halo/halo-proxy.ts:404`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 404-415 (`queryCredentials({ ids, type }: { ids?: PublicKey[]; type?: string } = {}): C...`, location confidence 0.07). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7dd7b30ca40-23 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 428-439 (`log('create invitation', { options });`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-24 namespace-brand-key-prefixing `packages/ui/react-ui-attention/src/types/ViewLocation.ts:23`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 23-29 (`export const aspect: Aspect<ViewLocation> = define<ViewLocation>({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-25 no-sleep-in-test `packages/ui/react-ui-editor/src/hooks/useTextEditor.test.tsx:138`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 138-149 (`selectionEnd`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-26 no-sleep-in-test `packages/ui/ui-editor/src/extensions/state/location.test.ts:70`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.98. The likeliest place is lines 70-81 (`await sleep(400);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7dd7b30ca40-27 use-context-scoped-cancellation `packages/ui/ui-editor/src/extensions/state/selection.ts:146`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 146-157 (`if (performance.now() < suppressUntil) {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0bf1ac1cc8d942a3eee25a9db8718722b555ab6d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 27 violations written to fragments, 512 uncertain, 1774 clean, 0 unanswered
- left for an agentic reviewer: 116 batch(es)

```text
requests: 1002 (314 verdicts re-asked with context the model requested)
estimated input tokens: 7679232
billed input tokens: 7313028 (cost $0.3071)
measured chars per token: 3.15
```

### Triage

- Resolved: 14 moves the Members companion's grouping into `groupByAttendedObject`; 25 and 26 wait for the next location report instead of sleeping 400 ms.
- Ignored as code this PR did not write: 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 17, 18, 19, 20, 21, 22, 23, 27. Each flagged range is unchanged from main or changed only by a rename (3 adds a `position`, 22/23 drop a label default, 27 renames a constant).
- 8: the one new effect in `SheetContent` publishes the selection anchor beside the component's other inline effects; a hook for three lines adds a seam with no second user.
- 12: the new lazy export follows its siblings' `ComponentType<any>`; it is not a cast.
- 13: the Members companion reads the active space, HALO members and plugin state; its rows reuse `PresenceItems`, which `SpacePresence.stories.tsx` covers.
- 15, 16: the story file's name and its existing `Small` wrapper are unchanged; the new `TestKeyboard` story pads its root like the others.
- 24: `view-location` matches its sibling aspect key `selection` in the same module.
