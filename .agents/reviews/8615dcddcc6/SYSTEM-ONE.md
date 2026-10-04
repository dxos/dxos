# System One pass — .agents/reviews/8615dcddcc6

- model: jev-latest
- base for context: `49e30c02e7f7a0c00c107c6d21e1194749272d87`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 137 uncertain, 97 clean, 0 unanswered

```text
requests: 155 (97 verdicts re-asked with context the model requested)
estimated input tokens: 1723780
billed input tokens: 1695705 (cost $0.0712)
measured chars per token: 3.05
```

## Still needs an agentic reviewer

Spawn one subagent per line below (54 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 30 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 34 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.52), `packages/core/echo/echo/src/Ref.ts` (p=0.30), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.39), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.25), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.38), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.24)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.46), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.17), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.56), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.38)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.23), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.35), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.36)
- `functions-before-classes` → append to `groups/26.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.32), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.62)
- `error-messages-carry-context` → append to `groups/28.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.43)
- `construct-populated-dont-mutate-after` → append to `groups/33.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.68)
- `parent-ref-backs-parent-pointer` → append to `groups/48.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.30)
- `bounded-live-state` → append to `groups/59.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.31), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.34)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.59), `packages/core/echo/echo/src/Ref.ts` (p=0.40), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.15), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.59), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.32)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.64), `packages/core/echo/echo/src/Ref.ts` (p=0.27), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.15), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.46), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.61)
- `import-as-namespace-is-all-or-nothing` → append to `groups/41.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.37), `packages/core/echo/echo/src/Ref.ts` (p=0.73), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.23), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.41), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.43)
- `inline-obj-parent` → append to `groups/43.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.42)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/45.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.27), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.16)
- `schema-persists-source-not-derived-duplicate` → append to `groups/47.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.20), `packages/core/echo/echo/src/Ref.ts` (p=0.27), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.47)
- `flat-layer-composition` → append to `groups/50.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.45), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.40)
- `effect-requirement-type-not-erased` → append to `groups/52.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.20)
- `deferred-callback-owns-its-context` → append to `groups/54.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.28), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.17)
- `no-sleep-in-test` → append to `groups/56.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.76)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/64.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.19)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.30), `packages/core/echo/echo/src/Ref.ts` (p=0.24), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.29), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.23), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.34), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.27)
- `query-capability-extends-filter-query-dsl` → append to `groups/46.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.23), `packages/core/echo/echo/src/Ref.ts` (p=0.29), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.21), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.26), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.33)
- `reuse-shared-test-layer` → append to `groups/61.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.70)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.30), `packages/core/echo/echo/src/Ref.ts` (p=0.22), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.29), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.34), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.31)
- `no-mixed-promise-effect-lifecycle` → append to `groups/49.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.68), `packages/core/echo/echo/src/Ref.ts` (p=0.49), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.58)
- `test-real-scenario-not-narrower-proxy` → append to `groups/62.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.55)
- `no-trivial-wrappers-over-official-apis` → append to `groups/39.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.47), `packages/core/echo/echo/src/Ref.ts` (p=0.25), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.33), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.32), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.26)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.45), `packages/core/echo/echo/src/Ref.ts` (p=0.34), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.65), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.41)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.37), `packages/core/echo/echo/src/Ref.ts` (p=0.30), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.24), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.26), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.50), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.41)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.36), `packages/core/echo/echo/src/Ref.ts` (p=0.32), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.25), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.19), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.51), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.44)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.24), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.15), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.26), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.26)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.19), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.20)
- `lifecycle-owned-by-its-resource` → append to `groups/29.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.28)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.41), `packages/core/echo/echo/src/Ref.ts` (p=0.35), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.29), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.24), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.61), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.41)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.36), `packages/core/echo/echo/src/Ref.ts` (p=0.34), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.22), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.31), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.29), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.38)
- `test-asserts-real-behavior` → append to `groups/63.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.18)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/echo/echo-client/src/proxy-db/database.test.ts` (p=0.25), `packages/core/echo/echo/src/Ref.ts` (p=0.48), `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.16), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.15), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.47), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.22)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/core/echo/echo/src/Ref.ts` (p=0.23), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.17)
- `canonical-api-surface` → append to `groups/24.md`: `packages/core/echo/echo/src/Ref.ts` (p=0.38), `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.34)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/core/echo/echo/src/internal/Ref/atoms.ts` (p=0.22), `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.61)
- `batch-queries-not-n-plus-1` → append to `groups/35.md`: `packages/core/echo/echo/src/internal/Ref/ref-array.ts` (p=0.35)
- `collapse-branches-via-identity-element` → append to `groups/37.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.23), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.24)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.53), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.15)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.22)
- `standalone-service-accessor` → append to `groups/51.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.19), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.38)
- `schema-declare-and-brand` → append to `groups/53.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.42)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/55.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.69)
- `declare-optional-services-with-noop-layers` → append to `groups/40.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.66)
- `dependency-direction` → append to `groups/20.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.19), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.22)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/echo/echo/src/internal/Ref/ref.ts` (p=0.30), `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` (p=0.28)
