---
branch: claude/priceless-fermi-8ba7be
commit: 3b8c53675e0f1236b3d3343d3aeb5e75f0c9fb25
base: origin/claude/storybook-production-build-8a3005
mode: fast
createdAt: 2026-11-24T13:40:55.887Z
isFinalized: true
groups: 175
rules: [atom-lifetime-bound-to-owner, bounded-live-state, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, name-for-general-behavior, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, scroll-list-pads-and-gaps, stable-component-for-optional-content, story-for-new-ui-component]
reviewId: 3b8c53675e0
---

_3 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3b8c53675e0-1 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-attention/src/core/backends.ts:15
- 3b8c53675e0-2 - ignored - bounded-live-state - packages/ui/react-ui-attention/src/core/backends.ts:95
- 3b8c53675e0-3 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- 3b8c53675e0-4 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- 3b8c53675e0-5 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27
- 3b8c53675e0-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:51
- 3b8c53675e0-7 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:122
- 3b8c53675e0-8 - ignored - stable-component-for-optional-content - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:182
- 3b8c53675e0-9 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66
- 3b8c53675e0-10 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormFieldRow.tsx:92
- 3b8c53675e0-11 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/layout/LayoutHeader.tsx:24
- 3b8c53675e0-12 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:313
- 3b8c53675e0-13 - ignored - scroll-list-pads-and-gaps - packages/ui/react-ui-mosaic/src/components/SearchStack/SearchStack.tsx:61
- 3b8c53675e0-14 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/ThemeProvider/Theme.tsx:1

## Issues

# WARN 3b8c53675e0-1 atom-lifetime-bound-to-owner `packages/ui/react-ui-attention/src/core/backends.ts:15`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.91. The likeliest place is lines 15-26 (`export class MemoryBackend implements ViewState.Backend {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3b8c53675e0-2 bounded-live-state `packages/ui/react-ui-attention/src/core/backends.ts:95`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 95-106 (`this.#atoms.set(key, atom);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-3 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3b8c53675e0-4 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-5 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.87. The likeliest place is lines 27-38 (`export const FunctionBody = ({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-6 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 51-62 (`<Box`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-7 no-try-catch-in-effect-code `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:122`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 122-133 (`value = newItem`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-8 stable-component-for-optional-content `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:182`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 182-193 (`/>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 66-77 (`? loaded`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-10 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormFieldRow.tsx:92`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 92-103 (`export const FormFieldRow = <T,>({`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-11 story-for-new-ui-component `packages/ui/react-ui-form/src/components/layout/LayoutHeader.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 24-35 (`export const LayoutHeader = ({ grid, schema }: { grid: LayoutGrid; schema: Sc...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3b8c53675e0-12 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:313`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 313-324 (`: (index) => getId(visibleItems![index]),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-13 scroll-list-pads-and-gaps `packages/ui/react-ui-mosaic/src/components/SearchStack/SearchStack.tsx:61`

System One judges this a likely violation of `scroll-list-pads-and-gaps` (A scrolling list of cards is padded by its viewport and spaced by its list, so no card touches another or the edge), p=0.82. The likeliest place is lines 61-72 (`<ScrollArea.Root orientation='vertical'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3b8c53675e0-14 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/ThemeProvider/Theme.tsx:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import React, { type PropsWithChildren, useEffect, useMemo } from 'react';`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/claude/storybook-production-build-8a3005`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 213 uncertain, 1190 clean, 0 unanswered
- left for an agentic reviewer: 79 batch(es)

```text
requests: 608 (123 verdicts re-asked with context the model requested)
estimated input tokens: 4052899
billed input tokens: 3994785 (cost $0.1678)
measured chars per token: 3.04
```

### Triage

All 14 issues are `ignored`: none points at a line this PR wrote.

- 1–9, 12, 13: the flagged code predates this PR. In these files the PR only repoints an import (or, in `ArrayField.tsx`, reads the dispatcher from context at line 78), and System One judged each file whole.
- 10, 11 (`story-for-new-ui-component`): `FormFieldRow` and `LayoutHeader` moved between modules unchanged; they are not new. The react-ui-form stories still render both (Form, FormLayout, ArrayField; 68 passing).
- 14 (`import-as-namespace-is-all-or-nothing`): `Theme.tsx` keeps its directive, matching filename, `export * as Theme` barrel and namespace imports. The new `ThemeContext.ts` is a plain module, not a namespace one, so `useThemeContext.ts` importing its members by name agrees with the rule. The `Theme.ThemeContext` member names predate this PR.

