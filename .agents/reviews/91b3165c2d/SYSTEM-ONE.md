# System One pass — .agents/reviews/91b3165c2d

- model: jev-latest
- base for context: `b0d6ce96af98142ade03d914e2298e7bcae74c60`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 46 uncertain, 38 clean, 0 unanswered

```text
requests: 52 (29 verdicts re-asked with context the model requested)
estimated input tokens: 526304
billed input tokens: 536272 (cost $0.0225)
measured chars per token: 2.94
```

## Still needs an agentic reviewer

Spawn one subagent per line below (37 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.47), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.28)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.27), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.31)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.26), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.20)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.61), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.33)
- `batch-queries-not-n-plus-1` → append to `groups/33.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.21)
- `bounded-live-state` → append to `groups/46.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.20), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.27)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.20), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.56)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.18)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/51.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.15)
- `reuse-shared-test-layer` → append to `groups/48.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.37)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.19), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.18)
- `test-real-scenario-not-narrower-proxy` → append to `groups/49.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.43)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.22), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.42)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.24), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.43)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.36), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.54)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.51), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.45)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.25)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.18), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.24)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.26), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.48)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.22), `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.30)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.20)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.26)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.71)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.26)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.48)
- `query-capability-extends-filter-query-dsl` → append to `groups/39.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.28)
- `no-mixed-promise-effect-lifecycle` → append to `groups/41.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.21)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.29)
- `dependency-direction` → append to `groups/20.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.18)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.22)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/echo/echo-host/src/automerge/subduction-test-utils.ts` (p=0.24)
- `diff-scoped-to-pr-purpose` → append to `groups/47.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.25)
