# System One pass — .agents/reviews/774e2e2f

- model: jev-latest
- base for context: `ff6a268f306953a8087dbf6dd8d474e85a5d5200`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 59 uncertain, 53 clean, 0 unanswered

```text
requests: 75 (30 verdicts re-asked with context the model requested)
estimated input tokens: 786816
billed input tokens: 784063 (cost $0.0329)
measured chars per token: 3.01
```

## Still needs an agentic reviewer

Spawn one subagent per line below (35 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.25), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.38), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.36)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.43), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.39), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.31)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.15), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.18)
- `bounded-live-state` → append to `groups/44.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.40), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.34), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.58)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.24), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.20), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.16)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.16), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.39)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.55), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.46)
- `deferred-callback-owns-its-context` → append to `groups/42.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.66)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.16), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.16)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.43), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.24), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.44)
- `errors-extend-base-error` → append to `groups/37.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.15)
- `no-mixed-promise-effect-lifecycle` → append to `groups/40.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.23)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.22), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.68)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.18), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.20), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.16)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.46), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.24), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.22)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.40), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.38), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.37)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.15), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.19)
- `state-owned-once` → append to `groups/21.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.18), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.47)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.28), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.34), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.37)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.20)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.27), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.22), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.31)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.25), `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.29), `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.67)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.25)
- `no-sleep-in-test` → append to `groups/43.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.28)
- `reuse-shared-test-layer` → append to `groups/47.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.44)
- `test-real-scenario-not-narrower-proxy` → append to `groups/48.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts` (p=0.41)
- `use-context-scoped-cancellation` → append to `groups/29.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.68)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.24)
- `lifecycle-owned-by-its-resource` → append to `groups/27.md`: `packages/core/mesh/edge-client/src/edge-ws-muxer.ts` (p=0.21)
- `diff-scoped-to-pr-purpose` → append to `groups/46.md`: `packages/core/mesh/edge-client/src/edge-ws-connection.ts` (p=0.26)
