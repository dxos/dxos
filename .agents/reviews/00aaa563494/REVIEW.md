---
branch: claude/canvas-style-property-sync-f6db46
commit: 00aaa563494e44cd730ca57c451c628dc1651723
base: 347546a097ef84c77c6e7b503c0f1b33be9ef4bb
mode: fast
createdAt: 2026-10-09T15:32:27.286Z
isFinalized: true
groups: 315
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, flat-layer-composition, name-for-general-behavior, named-react-imports, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console]
reviewId: 00aaa563494
---

_8 error(s), 36 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 00aaa563494-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-conductor/src/capabilities/create-object.ts:13
- 00aaa563494-2 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:129
- 00aaa563494-3 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808
- 00aaa563494-4 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- 00aaa563494-5 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- 00aaa563494-6 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-canvas-compute/src/index.ts:1
- 00aaa563494-7 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104
- 00aaa563494-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:86
- 00aaa563494-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:122
- 00aaa563494-10 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/scene/echo-store.ts:74
- 00aaa563494-11 - ignored - structured-logging-not-console - packages/ui/react-ui-canvas-compute/src/schema.test.ts:14
- 00aaa563494-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- 00aaa563494-13 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- 00aaa563494-14 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Boolean.tsx:62
- 00aaa563494-15 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 00aaa563494-16 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 00aaa563494-17 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 00aaa563494-18 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:26
- 00aaa563494-19 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:50
- 00aaa563494-20 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/node-def.tsx:82
- 00aaa563494-21 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas-compute/src/shapes/common/TextBox.tsx:40
- 00aaa563494-22 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:90
- 00aaa563494-23 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:28
- 00aaa563494-24 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:13
- 00aaa563494-25 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- 00aaa563494-26 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50
- 00aaa563494-27 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Scope.tsx:15
- 00aaa563494-28 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16
- 00aaa563494-29 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/trigger-def.ts:31
- 00aaa563494-30 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:32
- 00aaa563494-31 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:56
- 00aaa563494-32 - ignored - comment-hygiene - packages/ui/react-ui-canvas-compute/src/types/schema.ts:13
- 00aaa563494-33 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1
- 00aaa563494-34 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:24
- 00aaa563494-35 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:66
- 00aaa563494-36 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 00aaa563494-37 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 00aaa563494-38 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:551
- 00aaa563494-39 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51
- 00aaa563494-40 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79
- 00aaa563494-41 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781
- 00aaa563494-42 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- 00aaa563494-43 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41
- 00aaa563494-44 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61

## Issues

# WARN 00aaa563494-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-conductor/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 13-24 (`export default Capability.makeModule(`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# ERROR 00aaa563494-2 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 129-140 (`AiService.AiService,`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# ERROR 00aaa563494-3 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 808-824 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-4 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# ERROR 00aaa563494-5 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-6 namespace-export-with-internal-hiding `packages/ui/react-ui-canvas-compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './graph/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# ERROR 00aaa563494-7 no-casts `packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 104-115 (`(globalThis as any).__bullets++;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-9 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 122-133 (`<div className='flex flex-col h-full overflow-hidden border-l border-separator'>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# ERROR 00aaa563494-10 no-casts `packages/ui/react-ui-canvas-compute/src/scene/echo-store.ts:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 74-85 (`const nodeFromShape = (shape: CanvasBoard.Shape, z: string): Node => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-11 structured-logging-not-console `packages/ui/react-ui-canvas-compute/src/schema.test.ts:14`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 14-25 (`describe('compute', () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-12 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ node: shape }: ComputeNodeViewProps<AudioSha...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-13 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ node: shape }: ComputeNodeViewProps<BeaconS...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-14 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Boolean.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 62-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-15 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-16 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-17 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing layout, or a story frame's size; not a component's.

# WARN 00aaa563494-18 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:26`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.88. The likeliest place is lines 26-37 (`export const FunctionBody = ({`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-19 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 50-61 (`<Box`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-20 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/node-def.tsx:82`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 82-95 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-21 story-for-new-ui-component `packages/ui/react-ui-canvas-compute/src/shapes/common/TextBox.tsx:40`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 40-51 (`export const TextBox = forwardRef<TextBoxControl, TextBoxProps>(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Covered at the right level: `FontField` by the Properties stories (Test asserts the Font field), `TextBox` by the compute scene stories that render it.

# WARN 00aaa563494-22 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 90-97 (`/>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# ERROR 00aaa563494-23 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 28-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-24 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:13`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 13-24 (`export const GptComponent = ({ node: shape }: ComputeNodeViewProps<GptShape>)...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-25 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-26 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 50-61 (`const handleClick: Icon.IconProps['onClick'] = (ev) => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-27 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Scope.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-27 (`export const ScopeComponent = ({ node: shape }: ComputeNodeViewProps<ScopeSha...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-28 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 16-27 (`export const SwitchComponent = ({ node: shape }: ComputeNodeViewProps<SwitchS...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# ERROR 00aaa563494-29 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/trigger-def.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-37 (`export interface TriggerShape extends ComputeShape {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-30 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:32`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.83. The likeliest place is lines 32-43 (`}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# ERROR 00aaa563494-31 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-61 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main (`git diff origin/main` adds no cast); this PR only moves or repoints the file.

# WARN 00aaa563494-32 comment-hygiene `packages/ui/react-ui-canvas-compute/src/types/schema.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 13-18 (`// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The schema is copied byte-for-byte from the editor so stored boards decode unchanged; it stays identical until the editor is deleted.

# WARN 00aaa563494-33 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-17 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** False positive: the default `React` import is for JSX, as in every component here; members are imported by name.

# WARN 00aaa563494-34 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 24-35 (`export const FontField: FormFieldRenderer = ({ jsonPath, readonly, onBlur }) ...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Covered at the right level: `FontField` by the Properties stories (Test asserts the Font field), `TextBox` by the compute scene stories that render it.

# WARN 00aaa563494-35 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:66`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 66-75 (`return (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing layout, or a story frame's size; not a component's.

# WARN 00aaa563494-36 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-37 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing layout, or a story frame's size; not a component's.

# WARN 00aaa563494-38 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:551`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 551-562 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-39 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-64 (`const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-40 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-90 (`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-41 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 781-804 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-42 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was.

# WARN 00aaa563494-43 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 41-52 (`hasClipboard: true,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; this PR only re-wraps the component for `NodeDef` (`ComputeNodeViewProps`) or repoints an import, leaving this code as it was. react-ui has no Flex/Column primitive for a shape's body or a story frame.

# WARN 00aaa563494-44 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 61-70 (`const meta: Meta = {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing layout, or a story frame's size; not a component's.

## Appendix

### System One pass

- model: jev-latest
- base for context: `347546a097ef84c77c6e7b503c0f1b33be9ef4bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 44 violations written to fragments, 409 uncertain, 3060 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 1444 (276 verdicts re-asked with context the model requested)
estimated input tokens: 8127757
billed input tokens: 7712051 (cost $0.3239)
measured chars per token: 3.16
```
