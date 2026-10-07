---
branch: claude/canvas-style-property-sync-f6db46
commit: 67ebb20b1496da12c9a46548d1a10cf22b69e70d
base: fe083041afb6a6866691d89b9424605f35c381f0
mode: fast
createdAt: 2026-10-07T13:56:29.589Z
isFinalized: true
groups: 232
rules: [extract-non-rendering-logic-from-component, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-sleep-in-test, no-styling-wrapper-divs, prefer-branded-types-over-raw-primitives, story-for-new-ui-component]
reviewId: 67ebb20b149
---

_1 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 67ebb20b149-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:70
- 67ebb20b149-2 - ignored - story-for-new-ui-component - packages/plugins/plugin-canvas/src/containers/CanvasProperties/CanvasProperties.tsx:36
- 67ebb20b149-3 - ignored - no-sleep-in-test - packages/plugins/plugin-canvas/src/model/store.test.ts:88
- 67ebb20b149-4 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-uml/src/index.ts:1
- 67ebb20b149-5 - resolved - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:141
- 67ebb20b149-6 - ignored - prefer-branded-types-over-raw-primitives - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:17
- 67ebb20b149-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:367
- 67ebb20b149-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- 67ebb20b149-9 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7

## Issues

# WARN 67ebb20b149-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 70-81 (`return () => next.dispose();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-2 story-for-new-ui-component `packages/plugins/plugin-canvas/src/containers/CanvasProperties/CanvasProperties.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 36-47 (`export const CanvasProperties = ({ drawing }: CanvasPropertiesProps) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-3 no-sleep-in-test `packages/plugins/plugin-canvas/src/model/store.test.ts:88`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 88-95 (`await new Promise((resolve) => setTimeout(resolve, 100));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-4 namespace-export-with-internal-hiding `packages/plugins/plugin-uml/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-8 (`export * as UmlPlugin from './UmlPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 67ebb20b149-5 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:141`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 141-152 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-6 prefer-branded-types-over-raw-primitives `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:17`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.83. The likeliest place is lines 17-28 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.89). Judged with added `importers, imports` context after a first pass of 0.43. This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-7 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:367`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 367-380 (`const LabelPart = ({ node, editing, label }: LabelPartProps) => (`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 67ebb20b149-9 namespace-brand-key-prefixing `packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 7-15 (`export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: numbe...`, location confidence 0.88). Judged with added `package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 67ebb20b149-1 ignored: the effect binds the store for the canvas's lifetime and disposes it; it is the container's one lifecycle concern, and a hook would only move these four lines.
- 67ebb20b149-2 ignored: `CanvasProperties` renders inside the properties companion over a live ECHO drawing; it was verified in Composer (lattice and grid size round-trip), and its record logic is unit-tested in `content.test.ts`.
- 67ebb20b149-3 ignored: the test asserts that an async load does nothing (a self-link is never bound); there is no event for an absence, so the test yields once for the load to settle.
- 67ebb20b149-4 ignored: `index.ts` follows the plugin layout (plugin namespace plus the `#skills`/`#types` barrels), as the other plugins do.
- 67ebb20b149-5 resolved: the `as any[]` became a `Schema.is` guard on the tldraw shape records.
- 67ebb20b149-6 ignored: the story's local state holds a hue name; no branded hue type exists to use.
- 67ebb20b149-7 ignored: line 367 is `TextPart`, a component, not a styling wrapper div.
- 67ebb20b149-8 ignored: the flagged story logic predates this PR, which only renamed its fixtures.
- 67ebb20b149-9 ignored: `data-scene-overlay` is a DOM attribute name, not a namespaced brand key.

### System One pass

- model: jev-latest
- base for context: `fe083041afb6a6866691d89b9424605f35c381f0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 322 uncertain, 2169 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 1029 (221 verdicts re-asked with context the model requested)
estimated input tokens: 6456117
billed input tokens: 6093824 (cost $0.2559)
measured chars per token: 3.18
```
