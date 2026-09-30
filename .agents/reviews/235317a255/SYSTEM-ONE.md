# System One pass — .agents/reviews/235317a255

- model: jev-latest
- base for context: `22484d1b983da3df505d0b833648290235a67db7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 15 uncertain, 26 clean, 0 unanswered

```text
requests: 21 (14 verdicts re-asked with context the model requested)
estimated input tokens: 108532
billed input tokens: 104725 (cost $0.0044)
measured chars per token: 3.11
```

## Still needs an agentic reviewer

Spawn one subagent per line below (20 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 27 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 28 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 30 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.30)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.22)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.16)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.18)
- `batch-queries-not-n-plus-1` → append to `groups/31.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.29)
- `bounded-live-state` → append to `groups/41.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.37)
- `reuse-shared-test-layer` → append to `groups/43.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.55)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.18)
- `test-real-scenario-not-narrower-proxy` → append to `groups/44.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.46)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.43)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.21)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.32)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.22)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/echo/echo-host/src/automerge/subduction-id-lookup.test.ts` (p=0.16)
