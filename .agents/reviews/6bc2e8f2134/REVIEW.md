---
branch: claude/document-drag-sync-collections-f5663e
commit: 6bc2e8f2134501b7f4617b0dd81ef363bf64c3af
base: 6335883cd336831f05f33c48c72f2380ae5a28ae
mode: fast
createdAt: 2026-10-01T14:06:23.125Z
isFinalized: true
groups: 72
rules: [extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs]
reviewId: 6bc2e8f2134
---

_2 error(s), 4 warning(s)._

# WARN 6bc2e8f2134-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:310`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 310-321 (`useEffect(() => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6bc2e8f2134-2 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6bc2e8f2134-3 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6bc2e8f2134-4 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 87-104 (`const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: fa...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6bc2e8f2134-5 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:355`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 355-374 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6bc2e8f2134-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 1187-1210 (`return;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.
