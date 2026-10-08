---
branch: claude/document-drag-sync-collections-f5663e
commit: 224edb96c3567955b0904f44c9405b7731d26ea2
base: 959f4ba2a3376b96c48d2bd1ea944cc728ecea5d
mode: fast
createdAt: 2026-09-30T16:49:08.093Z
isFinalized: true
groups: 64
rules: [extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test]
reviewId: 224edb96c35
---

_2 error(s), 3 warning(s)._

# ERROR 224edb96c35-1 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:231`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 231-242 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 224edb96c35-2 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:267`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 267-278 (`});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 224edb96c35-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:249`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 249-260 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 224edb96c35-4 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 224edb96c35-5 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.
