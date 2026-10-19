---
branch: claude/document-drag-sync-collections-f5663e
commit: f2dacb29cdb49f10607a006dc8af75f8a50a04a0
base: bbe21d2067770d494d873a3981d55060243c4f59
mode: fast
createdAt: 2026-10-01T13:45:51.518Z
isFinalized: true
groups: 70
rules: [extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs]
reviewId: f2dacb29cdb
---

_2 error(s), 4 warning(s)._

# WARN f2dacb29cdb-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:310`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 310-321 (`useEffect(() => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f2dacb29cdb-2 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f2dacb29cdb-3 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f2dacb29cdb-4 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 87-104 (`const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: fa...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f2dacb29cdb-5 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:355`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 355-374 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f2dacb29cdb-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 1187-1210 (`return;`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.
