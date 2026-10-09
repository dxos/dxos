# System One pass — .agents/reviews/224edb96c35

- model: jev-latest
- base for context: `959f4ba2a3376b96c48d2bd1ea944cc728ecea5d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 103 uncertain, 123 clean, 0 unanswered

```text
requests: 138 (75 verdicts re-asked with context the model requested)
estimated input tokens: 1336308
billed input tokens: 1330839 (cost $0.0559)
measured chars per token: 3.01
```

## Still needs an agentic reviewer

Spawn one subagent per line below (49 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 32 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 35 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.40), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.40), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.32), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.16), `packages/sdk/app-graph/src/scheduler.ts` (p=0.36)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.27), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.42), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.42)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.16), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.36), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.20)
- `functions-before-classes` → append to `groups/26.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.22), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.37)
- `use-context-scoped-cancellation` → append to `groups/31.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.56), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.77)
- `scope-multi-tenant-queries-by-space` → append to `groups/33.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.15)
- `bounded-live-state` → append to `groups/52.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.21), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.62)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.16), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.63), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.54), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.19), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.25)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.43), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.65), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.39), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.19)
- `import-as-namespace-is-all-or-nothing` → append to `groups/39.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.41), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.54), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.57)
- `flat-layer-composition` → append to `groups/44.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.31)
- `deferred-callback-owns-its-context` → append to `groups/48.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.64), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.36)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/57.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.15)
- `reuse-shared-test-layer` → append to `groups/54.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.54)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.39), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.35), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.29), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.17), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16)
- `no-mixed-promise-effect-lifecycle` → append to `groups/43.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.74)
- `test-real-scenario-not-narrower-proxy` → append to `groups/55.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.36), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.26)
- `no-trivial-wrappers-over-official-apis` → append to `groups/38.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.37), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.42), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.38), `packages/sdk/app-graph/src/scheduler.ts` (p=0.25)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.25), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.34)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.51), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.27), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.36), `packages/sdk/app-graph/src/scheduler.ts` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.28), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.45), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.46), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.34), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.25), `packages/sdk/app-graph/src/scheduler.ts` (p=0.53)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.22), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.52)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.27), `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.43), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.60), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.21), `packages/sdk/app-graph/src/scheduler.ts` (p=0.16)
- `dont-recompute-in-reactive-closures` → append to `groups/30.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.17), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.21)
- `leaf-owns-its-subscription` → append to `groups/59.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.16)
- `reactive-state-via-atom-bridge` → append to `groups/64.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.26)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.19), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.43), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.15), `packages/sdk/app-graph/src/scheduler.ts` (p=0.39)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.15), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.16)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.18), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.26)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.25), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.26)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.50), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.32)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.64)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.24), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.31)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.37)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx` (p=0.32), `packages/sdk/app-graph/src/AppGraph.ts` (p=0.63), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.36), `packages/sdk/app-graph/src/scheduler.ts` (p=0.18)
- `collapse-branches-via-identity-element` → append to `groups/37.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.26)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/40.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.21)
- `schema-persists-source-not-derived-duplicate` → append to `groups/42.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.32)
- `effect-requirement-type-not-erased` → append to `groups/46.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.22)
- `schema-declare-and-brand` → append to `groups/47.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.50)
- `query-capability-extends-filter-query-dsl` → append to `groups/41.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.56)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/sdk/app-graph/src/AppGraph.ts` (p=0.56), `packages/sdk/app-graph/src/scheduler.browser.ts` (p=0.36), `packages/sdk/app-graph/src/scheduler.test.ts` (p=0.24), `packages/sdk/app-graph/src/scheduler.ts` (p=0.32)
- `diff-scoped-to-pr-purpose` → append to `groups/53.md`: `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts` (p=0.15)
