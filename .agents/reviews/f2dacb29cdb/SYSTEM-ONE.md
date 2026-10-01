# System One pass — .agents/reviews/f2dacb29cdb

- model: jev-latest
- base for context: `bbe21d2067770d494d873a3981d55060243c4f59`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 145 uncertain, 120 clean, 0 unanswered

```text
requests: 201 (97 verdicts re-asked with context the model requested)
estimated input tokens: 2433521
billed input tokens: 2427834 (cost $0.1020)
measured chars per token: 3.01
```

## Still needs an agentic reviewer

Spawn one subagent per line below (60 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 32 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 34 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.38), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.23), `packages/sdk/app-graph/src/scheduler.ts` (p=0.48), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.40)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.41), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.27), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.46)
- `dont-recompute-in-reactive-closures` → append to `groups/30.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.18), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.23), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.17), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.24)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.59), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.47), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.39)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.65), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.41), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.41), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.17), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.69)
- `import-as-namespace-is-all-or-nothing` → append to `groups/38.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.51), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.59), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.72), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.32)
- `leaf-owns-its-subscription` → append to `groups/62.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `reactive-state-via-atom-bridge` → append to `groups/69.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.25), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.19), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.45), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.54), `packages/sdk/app-graph/src/scheduler.ts` (p=0.41), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.21)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.33), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.28), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.29), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.19), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.32)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.19)
- `no-trivial-wrappers-over-official-apis` → append to `groups/37.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.42), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.40), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.43), `packages/sdk/app-graph/src/scheduler.ts` (p=0.29), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.47)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.46), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.32), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.45), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.45)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.29), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.33), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.27), `packages/sdk/app-graph/src/scheduler.ts` (p=0.35), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.23)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.41), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.31), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.ts` (p=0.45), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.37)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.25), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.21), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.20), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.18)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.46), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.41), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.28)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.68)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.46), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.61), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.56), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.54)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.25), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.30), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.35), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.33)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.40), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.53)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.54), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.52), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.33), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.24), `packages/sdk/app-graph/src/scheduler.ts` (p=0.35), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.47)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.30), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.63), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.50), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.27), `packages/sdk/app-graph/src/scheduler.ts` (p=0.19), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.25)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.40)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.38), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.19)
- `functions-before-classes` → append to `groups/26.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.42)
- `use-context-scoped-cancellation` → append to `groups/31.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.77)
- `collapse-branches-via-identity-element` → append to `groups/36.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.26), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.28), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.23)
- `bounded-live-state` → append to `groups/51.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.59), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.29)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.25), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.52)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/40.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.23), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.15)
- `schema-persists-source-not-derived-duplicate` → append to `groups/42.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.31)
- `effect-requirement-type-not-erased` → append to `groups/46.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.23), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.22)
- `schema-declare-and-brand` → append to `groups/47.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.55)
- `deferred-callback-owns-its-context` → append to `groups/48.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.35), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.46)
- `query-capability-extends-filter-query-dsl` → append to `groups/41.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.55), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.31)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.18), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.17), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.19), `packages/sdk/app-graph/src/scheduler.ts` (p=0.39)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.53)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.21)
- `flat-layer-composition` → append to `groups/44.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.33)
- `no-casts` → append to `groups/49.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.37)
- `no-mixed-promise-effect-lifecycle` → append to `groups/43.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.62)
- `no-compat-shims` → append to `groups/50.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.41)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.15), `packages/sdk/app-graph/src/scheduler.ts` (p=0.29)
- `test-real-scenario-not-narrower-proxy` → append to `groups/54.md`: `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.28)
- `test-asserts-real-behavior` → append to `groups/55.md`: `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.18)
- `themed-primitives-take-classNames` → append to `groups/57.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.36)
- `no-invented-theme-tokens` → append to `groups/58.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.46)
- `subscribe-where-you-read` → append to `groups/61.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.20)
- `write-through-the-live-object` → append to `groups/63.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.37)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/68.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.17)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/70.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.43)
- `no-hand-rolled-lists` → append to `groups/60.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.20)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/67.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.69)
- `diff-scoped-to-pr-purpose` → append to `groups/52.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.23)
