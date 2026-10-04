# System One pass — .agents/reviews/0ddc0c62817

- model: jev-latest
- base for context: `224edb96c3567955b0904f44c9405b7731d26ea2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 115 uncertain, 108 clean, 0 unanswered

```text
requests: 149 (78 verdicts re-asked with context the model requested)
estimated input tokens: 1556103
billed input tokens: 1550259 (cost $0.0651)
measured chars per token: 3.01
```

## Still needs an agentic reviewer

Spawn one subagent per line below (51 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 32 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 34 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.44), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.40), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.22), `packages/sdk/app-graph/src/scheduler.ts` (p=0.48)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.39), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.43), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26)
- `dont-recompute-in-reactive-closures` → append to `groups/30.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.18), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.23), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.18)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.71), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.49), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.43)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.67), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.38), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.38), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.16)
- `import-as-namespace-is-all-or-nothing` → append to `groups/38.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.57), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.55), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.74)
- `leaf-owns-its-subscription` → append to `groups/58.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15)
- `reactive-state-via-atom-bridge` → append to `groups/63.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.26)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.21), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.46), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.33), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.58), `packages/sdk/app-graph/src/scheduler.ts` (p=0.45)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.31), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.30), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.19), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.17), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.19)
- `no-trivial-wrappers-over-official-apis` → append to `groups/37.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.41), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.44), `packages/sdk/app-graph/src/scheduler.ts` (p=0.29)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.44), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.37), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.49)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.31), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.38), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.30), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.44), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.40), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.30), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.35), `packages/sdk/app-graph/src/scheduler.ts` (p=0.46)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.23), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.20), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.19)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.44), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.38)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.62)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.59), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.58), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.26), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.26), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.34), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.34)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.40)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.53), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.52), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.27), `packages/sdk/app-graph/src/scheduler.ts` (p=0.34)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.31), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.63), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.49), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.25), `packages/sdk/app-graph/src/scheduler.ts` (p=0.21)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.34)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.40), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.18)
- `functions-before-classes` → append to `groups/26.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.41), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.43)
- `collapse-branches-via-identity-element` → append to `groups/36.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.28), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.26)
- `bounded-live-state` → append to `groups/51.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.56), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.28)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.28), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.53)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/40.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.21), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.16)
- `schema-persists-source-not-derived-duplicate` → append to `groups/42.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.31)
- `effect-requirement-type-not-erased` → append to `groups/46.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.26), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.21)
- `schema-declare-and-brand` → append to `groups/47.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.53)
- `deferred-callback-owns-its-context` → append to `groups/48.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.37), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.46)
- `query-capability-extends-filter-query-dsl` → append to `groups/41.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.56), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.36)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.17), `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.20), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.18), `packages/sdk/app-graph/src/scheduler.ts` (p=0.33)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.48)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.24)
- `flat-layer-composition` → append to `groups/44.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.30)
- `no-casts` → append to `groups/49.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.37)
- `no-mixed-promise-effect-lifecycle` → append to `groups/43.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.67)
- `no-compat-shims` → append to `groups/50.md`: `packages/sdk/app-graph/src/AppGraphBuilder.ts` (p=0.34)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.17), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32)
- `test-real-scenario-not-narrower-proxy` → append to `groups/54.md`: `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.32)
- `test-asserts-real-behavior` → append to `groups/55.md`: `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.17)
- `diff-scoped-to-pr-purpose` → append to `groups/52.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.32)
