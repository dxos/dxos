# System One pass — .agents/reviews/3eea03906c6

- model: jev-latest
- base for context: `b63506be5884ac6b0666595d84d0196a7493a72c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 140 uncertain, 61 clean, 0 unanswered

```text
requests: 152 (87 verdicts re-asked with context the model requested)
estimated input tokens: 1980009
failed requests: 5 (their pairs are listed as unanswered)
billed input tokens: 1972060 (cost $0.0828)
measured chars per token: 2.94
```

## Still needs an agentic reviewer

Spawn one subagent per line below (51 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.28), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.33), `packages/core/echo/index-core/src/index-engine.ts` (p=0.34), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.35), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.38)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.31), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.27), `packages/core/echo/index-core/src/index-engine.ts` (p=0.25), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.54), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.44)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.19), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.38), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.30), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.33)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.15), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.31), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.27)
- `scope-multi-tenant-queries-by-space` → append to `groups/31.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.28), `packages/core/echo/index-core/src/index-engine.ts` (p=0.46), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.16)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.32), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.34), `packages/core/echo/index-core/src/index-engine.ts` (p=0.37), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.31), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.29)
- `import-as-namespace-is-all-or-nothing` → append to `groups/38.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.47), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.20), `packages/core/echo/index-core/src/index-engine.ts` (p=0.30), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.44), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.33)
- `deferred-callback-owns-its-context` → append to `groups/47.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.28), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.58), `packages/core/echo/index-core/src/index-engine.ts` (p=0.35), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.36)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/48.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.30), `packages/core/echo/index-core/src/index-engine.ts` (p=0.25)
- `reuse-shared-test-layer` → append to `groups/55.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.19), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.54)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.20), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.29), `packages/core/echo/index-core/src/index-engine.ts` (p=0.31), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.47), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.50)
- `no-mixed-promise-effect-lifecycle` → append to `groups/44.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.66), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.60), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.63)
- `test-real-scenario-not-narrower-proxy` → append to `groups/56.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.51), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.65)
- `no-trivial-wrappers-over-official-apis` → append to `groups/37.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.26), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.20), `packages/core/echo/index-core/src/index-engine.ts` (p=0.34), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.66), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.39)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.24), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.17), `packages/core/echo/index-core/src/index-engine.ts` (p=0.73), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.50), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.49)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.33), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.59), `packages/core/echo/index-core/src/index-engine.ts` (p=0.60), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.71), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.48)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.25), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.37), `packages/core/echo/index-core/src/index-engine.ts` (p=0.39), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.49), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.51)
- `dependency-direction` → append to `groups/20.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.18), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.18), `packages/core/echo/index-core/src/index-engine.ts` (p=0.22), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.22)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.29), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.43), `packages/core/echo/index-core/src/index-engine.ts` (p=0.58), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.24), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.46)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.29), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.36), `packages/core/echo/index-core/src/index-engine.ts` (p=0.29), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.29), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.24)
- `test-asserts-real-behavior` → append to `groups/57.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.18), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.40)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.18), `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.43), `packages/core/echo/index-core/src/index-engine.ts` (p=0.43), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.16), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.45)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.75), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.19)
- `collapse-branches-via-identity-element` → append to `groups/36.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.16), `packages/core/echo/index-core/src/index-engine.ts` (p=0.18), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.20)
- `bounded-live-state` → append to `groups/52.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.52), `packages/core/echo/index-core/src/index-engine.ts` (p=0.56), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.25)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.45), `packages/core/echo/index-core/src/index-engine.ts` (p=0.42), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.49), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.44)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.78), `packages/core/echo/index-core/src/index-engine.ts` (p=0.15), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.19), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.61)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.68)
- `no-casts` → append to `groups/50.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.77)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.19), `packages/core/echo/index-core/src/index-engine.ts` (p=0.47), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.27), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.25)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.17), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.21), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.22)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.22), `packages/core/echo/index-core/src/index-engine.ts` (p=0.16), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.23)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/echo/echo-host/src/db-host/query-service.ts` (p=0.33), `packages/core/echo/index-core/src/index-engine.ts` (p=0.26), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.29)
- `collect-dead-entities` → append to `groups/53.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.17)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/41.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.23), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.20)
- `schema-persists-source-not-derived-duplicate` → append to `groups/43.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.22), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.21)
- `standalone-service-accessor` → append to `groups/45.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.25), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.26), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.26)
- `effect-requirement-type-not-erased` → append to `groups/46.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.33)
- `query-capability-extends-filter-query-dsl` → append to `groups/42.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.57), `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.26), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.17)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/core/echo/index-core/src/index-engine.ts` (p=0.17)
- `construct-populated-dont-mutate-after` → append to `groups/32.md`: `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.26)
- `batch-queries-not-n-plus-1` → append to `groups/34.md`: `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.16)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/58.md`: `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.17)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/sdk/client-e2e/src/spaces.test.ts` (p=0.34), `packages/sdk/client/src/echo/space-proxy.ts` (p=0.49)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/sdk/client/src/echo/space-proxy.ts` (p=0.77)
- `diff-scoped-to-pr-purpose` → append to `groups/54.md`: `packages/core/echo/echo-host/src/db-host/echo-host.test.ts` (p=0.17)
