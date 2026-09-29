# System One pass — .agents/reviews/33dc23e6ea

- model: jev-latest
- base for context: `a68b20cc367810b16f6ef72a39ab7fe8eb36956a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 112 uncertain, 49 clean, 0 unanswered

```text
requests: 144 (65 verdicts re-asked with context the model requested)
estimated input tokens: 2544233
billed input tokens: 2538496 (cost $0.1066)
measured chars per token: 3.01
```

## Still needs an agentic reviewer

Spawn one subagent per line below (46 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.35), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.40), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.30)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.52), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.35), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.47), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.33)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.25), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.24), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.21), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.26)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.28), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.20), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.36)
- `collapse-branches-via-identity-element` → append to `groups/36.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.16), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.25)
- `bounded-live-state` → append to `groups/51.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.31), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.43), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.63), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.22)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.21), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.49), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.63)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.31), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.24), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.23), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.26)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.40), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.52), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.61), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.55)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.15), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.18)
- `import-as-namespace-is-all-or-nothing` → append to `groups/38.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.29), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.32), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.33)
- `deferred-callback-owns-its-context` → append to `groups/46.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.38), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.42), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.60)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/56.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.19)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.22), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.32), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.25)
- `reuse-shared-test-layer` → append to `groups/53.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.29), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.20)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.22), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.18)
- `no-mixed-promise-effect-lifecycle` → append to `groups/43.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.58), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.46), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.78), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.18)
- `test-real-scenario-not-narrower-proxy` → append to `groups/54.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.69), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.51)
- `no-trivial-wrappers-over-official-apis` → append to `groups/37.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.21), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.49), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.33)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.63), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.49), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.68), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.38)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.41), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.34), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.40), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.57)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.42), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.51), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.44)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.15), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.26), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.24)
- `dependency-direction` → append to `groups/20.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.16), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.19)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.16), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.22), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.39)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.34), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.37), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.58), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.46)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.33), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.29), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.28)
- `test-asserts-real-behavior` → append to `groups/55.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.17)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.27), `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts` (p=0.28), `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.54), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.22)
- `scope-multi-tenant-queries-by-space` → append to `groups/32.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.27)
- `schema-persists-source-not-derived-duplicate` → append to `groups/42.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.26)
- `standalone-service-accessor` → append to `groups/44.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.28)
- `effect-requirement-type-not-erased` → append to `groups/45.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.21)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/47.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.39)
- `query-capability-extends-filter-query-dsl` → append to `groups/41.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.34), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.23)
- `errors-extend-base-error` → append to `groups/39.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.31)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.31)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.29), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.24)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/echo/echo-host/src/automerge/automerge-host.ts` (p=0.29), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.22)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.45)
- `diff-scoped-to-pr-purpose` → append to `groups/52.md`: `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts` (p=0.19)
