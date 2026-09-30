# System One pass — .agents/reviews/22484d1b98

- model: jev-latest
- base for context: `origin/main`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 57 uncertain, 61 clean, 0 unanswered

```text
requests: 70 (31 verdicts re-asked with context the model requested)
estimated input tokens: 535833
billed input tokens: 536576 (cost $0.0225)
measured chars per token: 3.00
```

## Still needs an agentic reviewer

Spawn one subagent per line below (36 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.31), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.31), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.28)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.30), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.35), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.25)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.24), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.22), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.44)
- `batch-queries-not-n-plus-1` → append to `groups/33.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.22)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.20), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.39)
- `bounded-live-state` → append to `groups/47.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.17), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.28)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.26)
- `reuse-shared-test-layer` → append to `groups/49.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.29)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.20)
- `test-real-scenario-not-narrower-proxy` → append to `groups/50.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.45)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.16), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.29), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.23)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.42)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.30), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.52), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.27)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.47), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.45), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.37)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.16)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.24), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.47), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.23)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.16), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.30), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.39)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.15), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.20)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.37)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.65)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.25)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.45), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.60)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.26), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.21)
- `query-capability-extends-filter-query-dsl` → append to `groups/40.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.25)
- `no-mixed-promise-effect-lifecycle` → append to `groups/42.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.15)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.20), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.17)
- `dependency-direction` → append to `groups/20.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.15)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.24)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.21), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.16)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.21), `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.29)
- `deferred-callback-owns-its-context` → append to `groups/45.md`: `packages/core/echo/echo-host/src/testing/test-network-adapter.ts` (p=0.16)
