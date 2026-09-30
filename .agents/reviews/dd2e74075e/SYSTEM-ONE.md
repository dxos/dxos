# System One pass — .agents/reviews/dd2e74075e

- model: jev-latest
- base for context: `37fd51fe9c6e7d8a3dead7623a06ebcfafc7f586`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 21 uncertain, 23 clean, 0 unanswered

```text
requests: 24 (16 verdicts re-asked with context the model requested)
estimated input tokens: 216447
billed input tokens: 217773 (cost $0.0091)
measured chars per token: 2.98
```

## Still needs an agentic reviewer

Spawn one subagent per line below (26 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.33)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.25)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.25)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.59)
- `batch-queries-not-n-plus-1` → append to `groups/33.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.16)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.23)
- `bounded-live-state` → append to `groups/44.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.19)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.22)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.18)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.15)
- `reuse-shared-test-layer` → append to `groups/46.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.42)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.21)
- `test-real-scenario-not-narrower-proxy` → append to `groups/47.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.43)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.24)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.25)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.35)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.51)
- `state-owned-once` → append to `groups/21.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.27)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.17)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.24)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/automerge/subduction-slow-peer.test.ts` (p=0.22)
