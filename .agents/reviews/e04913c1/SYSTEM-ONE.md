# System One pass — .agents/reviews/e04913c1

- model: jev-latest
- base for context: `dc3302bcfd2a4136e2e7656a569d1486fec18237`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 64 uncertain, 48 clean, 0 unanswered

```text
requests: 80 (38 verdicts re-asked with context the model requested)
estimated input tokens: 592745
billed input tokens: 580281 (cost $0.0244)
measured chars per token: 3.06
```

## Still needs an agentic reviewer

Spawn one subagent per line below (37 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 20 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/23.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.35), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.27), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.35)
- `no-impossible-state-handling` → append to `groups/24.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.29), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.26), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.59)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.18), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.21), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.46)
- `use-context-scoped-cancellation` → append to `groups/30.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.70)
- `bounded-live-state` → append to `groups/46.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.22), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.26), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.47)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.19)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.34), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.35), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.78)
- `deferred-callback-owns-its-context` → append to `groups/43.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.46), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.61)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/51.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.18)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.21), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.37), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.40)
- `no-mixed-promise-effect-lifecycle` → append to `groups/41.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.31), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.46), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.22)
- `test-real-scenario-not-narrower-proxy` → append to `groups/49.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.60)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.71), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.37), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.35)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.20), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.28), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.15)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.34), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.40), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.25)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.34), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.39), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.38)
- `no-env-vars-in-low-level-modules` → append to `groups/18.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.25)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.24)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.40), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.55), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.40)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.27), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.25), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.23)
- `test-asserts-real-behavior` → append to `groups/50.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.35)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.26), `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.41), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.32)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.32), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.21)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.74)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.20)
- `no-casts` → append to `groups/45.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.73)
- `state-owned-once` → append to `groups/22.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.18), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.29)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/mesh/edge-client/src/edge-client.ts` (p=0.27), `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.28)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.20)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.31)
- `reuse-existing-mechanism` → append to `groups/19.md`: `packages/core/mesh/edge-client/src/testing/test-utils.ts` (p=0.18)
- `diff-scoped-to-pr-purpose` → append to `groups/47.md`: `packages/core/mesh/edge-client/src/edge-client.test.ts` (p=0.17)
