---
branch: dm/confident-lovelace-t9arta
commit: 1182eb228cb1facbc6100137aeda8f0665faecca
base: 5b321997229a9bdfc2e0d2b54a0fadc94fe902ea
mode: fast
createdAt: 2026-09-29T09:36:27.367Z
isFinalized: true
groups: 103
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 1182eb228c
---

_2 error(s), 7 warning(s)._

# WARN 1182eb228c-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1182eb228c-2 no-casts `packages/plugins/plugin-markdown/src/hooks/useLinkQuery.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 59-70 (`);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/create-object.ts:97`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 97-108 (`createObject: (props, options) =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-5 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 246-257 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-6 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:40`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 40-51 (`const plugins = yield* Effect.serviceOption(Plugin.Service);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/operations/notify-type-added.ts:17`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 17-29 (`export const notifyTypeAdded = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1182eb228c-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-table/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 13-24 (`import { ViewModel, createDefaultSchema } from '@dxos/schema';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1182eb228c-9 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:257`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 257-270 (`.filter((order): order is QueryAST.Order & { kind: 'property' } => order.kind...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.
