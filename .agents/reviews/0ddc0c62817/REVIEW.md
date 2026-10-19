---
branch: claude/document-drag-sync-collections-f5663e
commit: 0ddc0c62817c73dab5167c5b9793b1191a46c830
base: 224edb96c3567955b0904f44c9405b7731d26ea2
mode: fast
createdAt: 2026-09-30T17:31:04.935Z
isFinalized: true
groups: 63
rules: [extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, use-context-scoped-cancellation]
reviewId: 0ddc0c62817
---

_1 error(s), 3 warning(s)._

# WARN 0ddc0c62817-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0ddc0c62817-2 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0ddc0c62817-3 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0ddc0c62817-4 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.
