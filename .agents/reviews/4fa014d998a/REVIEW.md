---
branch: claude/canvas-style-property-sync-f6db46
commit: 4fa014d998a9f74bcae44a2b4a0a24ef182fa125
base: 347546a097ef84c77c6e7b503c0f1b33be9ef4bb
mode: fast
createdAt: 2026-10-09T17:18:53.323Z
isFinalized: true
groups: 349
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, flat-layer-composition, name-for-general-behavior, named-react-imports, namespace-export-with-internal-hiding, no-casts, no-compat-shims, no-styling-wrapper-divs, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console]
reviewId: 4fa014d998a
---

_8 error(s), 40 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4fa014d998a-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-conductor/src/capabilities/create-object.ts:13
- 4fa014d998a-2 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:119
- 4fa014d998a-3 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808
- 4fa014d998a-4 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- 4fa014d998a-5 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- 4fa014d998a-6 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-canvas-compute/src/index.ts:1
- 4fa014d998a-7 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104
- 4fa014d998a-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:86
- 4fa014d998a-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:122
- 4fa014d998a-10 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/scene/echo-store.ts:74
- 4fa014d998a-11 - ignored - structured-logging-not-console - packages/ui/react-ui-canvas-compute/src/schema.test.ts:14
- 4fa014d998a-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- 4fa014d998a-13 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- 4fa014d998a-14 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Boolean.tsx:62
- 4fa014d998a-15 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 4fa014d998a-16 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 4fa014d998a-17 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41
- 4fa014d998a-18 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27
- 4fa014d998a-19 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:51
- 4fa014d998a-20 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/node-def.tsx:94
- 4fa014d998a-21 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas-compute/src/shapes/common/TextBox.tsx:40
- 4fa014d998a-22 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:78
- 4fa014d998a-23 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:28
- 4fa014d998a-24 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:13
- 4fa014d998a-25 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- 4fa014d998a-26 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62
- 4fa014d998a-27 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Scope.tsx:15
- 4fa014d998a-28 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16
- 4fa014d998a-29 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/trigger-def.ts:31
- 4fa014d998a-30 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:32
- 4fa014d998a-31 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:56
- 4fa014d998a-32 - ignored - comment-hygiene - packages/ui/react-ui-canvas-compute/src/types/schema.ts:13
- 4fa014d998a-33 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:145
- 4fa014d998a-34 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/AlignField.tsx:1
- 4fa014d998a-35 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1
- 4fa014d998a-36 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:24
- 4fa014d998a-37 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:66
- 4fa014d998a-38 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 4fa014d998a-39 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 4fa014d998a-40 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:551
- 4fa014d998a-41 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51
- 4fa014d998a-42 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79
- 4fa014d998a-43 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781
- 4fa014d998a-44 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- 4fa014d998a-45 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41
- 4fa014d998a-46 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61
- 4fa014d998a-47 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-canvas/src/index.ts:1
- 4fa014d998a-48 - resolved - no-compat-shims - packages/ui/react-ui-canvas/src/scene.ts:1

## Issues

# WARN 4fa014d998a-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-conductor/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 13-24 (`export default Capability.makeModule(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-2 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`AiService.AiService,`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-3 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 808-824 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-4 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-5 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-6 namespace-export-with-internal-hiding `packages/ui/react-ui-canvas-compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './graph/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-7 no-casts `packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 104-115 (`(globalThis as any).__bullets++;`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-9 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 122-133 (`<div className='flex flex-col h-full overflow-hidden border-l border-separator'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-10 no-casts `packages/ui/react-ui-canvas-compute/src/scene/echo-store.ts:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 74-85 (`const nodeFromShape = (shape: CanvasBoard.Shape, z: string): Node => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-11 structured-logging-not-console `packages/ui/react-ui-canvas-compute/src/schema.test.ts:14`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 14-25 (`describe('compute', () => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-12 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ node: shape }: ComputeNodeViewProps<AudioSha...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-13 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ node: shape }: ComputeNodeViewProps<BeaconS...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-14 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Boolean.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 62-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-15 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-16 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-17 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:41`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 41-52 (`const nodeId = shape.node;`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-18 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.88. The likeliest place is lines 27-38 (`export const FunctionBody = ({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-19 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-62 (`<Box`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-20 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/node-def.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 94-105 (`if (!node.node) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-21 story-for-new-ui-component `packages/ui/react-ui-canvas-compute/src/shapes/common/TextBox.tsx:40`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 40-51 (`export const TextBox = forwardRef<TextBoxControl, TextBoxProps>(`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-22 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`value={JSON.stringify(node.value, null, 2)}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-23 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 28-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-24 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:13`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 13-24 (`export const GptComponent = ({ node: shape }: ComputeNodeViewProps<GptShape>)...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-25 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-26 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-68 (`onPointerDown={stopGesture}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-27 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Scope.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-27 (`export const ScopeComponent = ({ node: shape }: ComputeNodeViewProps<ScopeSha...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-28 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-27 (`export const SwitchComponent = ({ node: shape }: ComputeNodeViewProps<SwitchS...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-29 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/trigger-def.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-37 (`export interface TriggerShape extends ComputeShape {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-30 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:32`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 32-43 (`}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4fa014d998a-31 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-61 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-32 comment-hygiene `packages/ui/react-ui-canvas-compute/src/types/schema.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 13-18 (`// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-33 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 145-156 (`return (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The rail's group sections are the palette's own layout; react-ui has no Flex/Column primitive for them.

# WARN 4fa014d998a-34 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/AlignField.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.96. The likeliest place is lines 1-15 (`import type * as SchemaAST from 'effect/SchemaAST';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** False positive: the default `React` import is for JSX; members are imported by name.

# WARN 4fa014d998a-35 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-17 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-36 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 24-35 (`export const FontField: FormFieldRenderer = ({ jsonPath, readonly }) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-37 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:66`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 66-75 (`return (`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-38 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-39 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-40 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:551`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 551-562 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-41 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-64 (`const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-42 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-90 (`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-43 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 781-804 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-44 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-45 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 41-52 (`hasClipboard: true,`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-46 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 61-70 (`const meta: Meta = {`, location confidence 0.74). Judged with added `package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 4fa014d998a-47 namespace-export-with-internal-hiding `packages/ui/react-ui-canvas/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-9 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The package barrel has always re-exported its folders by wildcard (it was `src/scene.ts`); this change only moved it to the root.

# WARN 4fa014d998a-48 no-compat-shims `packages/ui/react-ui-canvas/src/scene.ts:1`

System One judges this a likely violation of `no-compat-shims` (No compatibility re-exports when moving code), p=0.85. The likeliest place is lines 1-7 (`export * from './index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `src/scene.ts` is deleted; the `./scene` export points at `src/index.ts` directly.

## Appendix

### System One pass

- model: jev-latest
- base for context: `347546a097ef84c77c6e7b503c0f1b33be9ef4bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 48 violations written to fragments, 419 uncertain, 3336 clean, 0 unanswered
- left for an agentic reviewer: 77 batch(es)

```text
requests: 1545 (295 verdicts re-asked with context the model requested)
estimated input tokens: 8719924
billed input tokens: 8271379 (cost $0.3474)
measured chars per token: 3.16
```
