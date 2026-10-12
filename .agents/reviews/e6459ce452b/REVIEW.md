---
branch: claude/canvas-style-property-sync-f6db46
commit: e6459ce452b08c696cb8a13883bca3b59d1fce4c
base: db72c48513fd5533ed7a28aaf33893c164b0a057
mode: fast
createdAt: 2026-10-07T17:43:10.098Z
isFinalized: true
groups: 273
rules: [extract-non-rendering-logic-from-component, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-sleep-in-test, no-styling-wrapper-divs, prefer-branded-types-over-raw-primitives, story-for-new-ui-component]
reviewId: e6459ce452b
---

_0 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e6459ce452b-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:70
- e6459ce452b-2 - ignored - story-for-new-ui-component - packages/plugins/plugin-canvas/src/containers/CanvasProperties/CanvasProperties.tsx:36
- e6459ce452b-3 - ignored - no-sleep-in-test - packages/plugins/plugin-canvas/src/model/store.test.ts:88
- e6459ce452b-4 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-uml/src/index.ts:1
- e6459ce452b-5 - ignored - prefer-branded-types-over-raw-primitives - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:17
- e6459ce452b-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:445
- e6459ce452b-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- e6459ce452b-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52
- e6459ce452b-9 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7

## Issues

# WARN e6459ce452b-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 70-81 (`return () => next.dispose();`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-2 story-for-new-ui-component `packages/plugins/plugin-canvas/src/containers/CanvasProperties/CanvasProperties.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 36-47 (`export const CanvasProperties = ({ drawing }: CanvasPropertiesProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-3 no-sleep-in-test `packages/plugins/plugin-canvas/src/model/store.test.ts:88`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 88-95 (`await new Promise((resolve) => setTimeout(resolve, 100));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-4 namespace-export-with-internal-hiding `packages/plugins/plugin-uml/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.86. The likeliest place is lines 1-8 (`export * as UmlPlugin from './UmlPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-5 prefer-branded-types-over-raw-primitives `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:17`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 17-28 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.89). Judged with added `importers, imports` context after a first pass of 0.43. This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-6 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:445`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 445-456 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-8 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-62 (`<NavigationToolbar actions={actions}>depth {actions.path.length - 1}</Navigat...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6459ce452b-9 namespace-brand-key-prefixing `packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 7-15 (`export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: numbe...`, location confidence 0.92). Judged with added `package` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- e6459ce452b-8 ignored: the story's layout column predates this PR, which only added a `zoomReset` action to its toolbar props.
- The other eight carry over from `67ebb20b149` with the reasons recorded there.

### System One pass

- model: jev-latest
- base for context: `db72c48513fd5533ed7a28aaf33893c164b0a057`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 362 uncertain, 2511 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 1187 (256 verdicts re-asked with context the model requested)
estimated input tokens: 7456401
billed input tokens: 7042803 (cost $0.2958)
measured chars per token: 3.18
```
