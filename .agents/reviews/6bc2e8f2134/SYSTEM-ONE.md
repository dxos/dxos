# System One pass — .agents/reviews/6bc2e8f2134

- model: jev-latest
- base for context: `6335883cd336831f05f33c48c72f2380ae5a28ae`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 179 uncertain, 131 clean, 0 unanswered

```text
requests: 239 (117 verdicts re-asked with context the model requested)
estimated input tokens: 3221024
billed input tokens: 3201375 (cost $0.1345)
measured chars per token: 3.02
```

## Still needs an agentic reviewer

Spawn one subagent per line below (64 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 32 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 35 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.35), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.23), `packages/sdk/app-graph/src/scheduler.ts` (p=0.47), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.38)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.38), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.37), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.48)
- `dont-recompute-in-reactive-closures` → append to `groups/30.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.16), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.22), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.18), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.18), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.24)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.71), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.47), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.22), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.44), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.64), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.43), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.25), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.41), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.17), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.72)
- `import-as-namespace-is-all-or-nothing` → append to `groups/39.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.54), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.51), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.66), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.72), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.34)
- `leaf-owns-its-subscription` → append to `groups/64.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `reactive-state-via-atom-bridge` → append to `groups/71.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.28), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.21), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.45), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.21), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.34), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.56), `packages/sdk/app-graph/src/scheduler.ts` (p=0.42), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.21)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.33), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.32), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.25), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.22), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.16), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.41)
- `no-trivial-wrappers-over-official-apis` → append to `groups/38.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.41), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.41), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.58), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.46), `packages/sdk/app-graph/src/scheduler.ts` (p=0.24), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.45)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.44), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.33), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.49), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.44), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.43)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.29), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.35), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.31), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.27), `packages/sdk/app-graph/src/scheduler.ts` (p=0.31), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.25)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.46), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.34), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.40), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.ts` (p=0.48), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.38)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.26), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.22), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.19), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.17)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.46), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.27)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.68)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.41), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.63), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.33), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.56), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.56)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.25), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.31), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.20), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.34), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.34)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.41), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.53)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.16), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.52), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.58), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.51), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.31), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.25), `packages/sdk/app-graph/src/scheduler.ts` (p=0.33), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.53)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.32), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.63), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.31), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.51), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.ts` (p=0.21), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.22)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.37)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.37), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.27), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.20)
- `functions-before-classes` → append to `groups/26.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.40), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.41), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.44)
- `use-context-scoped-cancellation` → append to `groups/31.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.77)
- `collapse-branches-via-identity-element` → append to `groups/37.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.28), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.21), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.28), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.24)
- `bounded-live-state` → append to `groups/53.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.60), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.26), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.31)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.23), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.56), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.51)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/41.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.20), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.16)
- `schema-persists-source-not-derived-duplicate` → append to `groups/43.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.27)
- `effect-requirement-type-not-erased` → append to `groups/47.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.20), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.23)
- `schema-declare-and-brand` → append to `groups/48.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.50)
- `deferred-callback-owns-its-context` → append to `groups/49.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.29), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.47)
- `query-capability-extends-filter-query-dsl` → append to `groups/42.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.57), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.30), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.33)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.16)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.24), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.19), `packages/sdk/app-graph/src/scheduler.ts` (p=0.37), `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.15)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.54), `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.19)
- `construct-populated-dont-mutate-after` → append to `groups/34.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.16)
- `flat-layer-composition` → append to `groups/45.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.32), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.30)
- `standalone-service-accessor` → append to `groups/46.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.26)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/50.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.78)
- `no-casts` → append to `groups/51.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.63), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.35)
- `reuse-shared-test-layer` → append to `groups/55.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.28)
- `test-real-scenario-not-narrower-proxy` → append to `groups/56.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.28), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.26)
- `test-asserts-real-behavior` → append to `groups/57.md`: `packages/sdk/app-graph/src/AppGraphBuilder.test.ts` (p=0.21), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.21)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.25)
- `no-mixed-promise-effect-lifecycle` → append to `groups/44.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.62)
- `no-compat-shims` → append to `groups/52.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.38)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.16), `packages/sdk/app-graph/src/scheduler.ts` (p=0.30)
- `themed-primitives-take-classNames` → append to `groups/59.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.37)
- `no-invented-theme-tokens` → append to `groups/60.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.43)
- `subscribe-where-you-read` → append to `groups/63.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.20)
- `write-through-the-live-object` → append to `groups/65.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.40)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/70.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.17)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/72.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.39)
- `no-hand-rolled-lists` → append to `groups/62.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.22)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/69.md`: `packages/ui/react-ui-list/src/components/Tree/Tree.tsx` (p=0.66)
- `diff-scoped-to-pr-purpose` → append to `groups/54.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.37)
