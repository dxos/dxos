# System One pass — .agents/reviews/4c290a69

- model: jev-latest
- base for context: `15fa01cd6479ab4bd680aded6ddc0d0511879ca6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 76 uncertain, 47 clean, 0 unanswered

```text
requests: 75 (46 verdicts re-asked with context the model requested)
estimated input tokens: 765707
billed input tokens: 687488 (cost $0.0289)
measured chars per token: 3.34
```

## Still needs an agentic reviewer

Spawn one subagent per line below (41 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.27), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.30), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.31)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.30), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.34), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.26)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.58), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.19), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.28)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.15), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.16)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.51)
- `scope-multi-tenant-queries-by-space` → append to `groups/31.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.26), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.22)
- `collapse-branches-via-identity-element` → append to `groups/34.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.22), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.38)
- `bounded-live-state` → append to `groups/49.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.54), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.35), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.38)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.49)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.46), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.38), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.44)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.21), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.22)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.50), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.42), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.34)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/39.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.23), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.17)
- `flat-layer-composition` → append to `groups/43.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.55), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.46)
- `standalone-service-accessor` → append to `groups/44.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.45)
- `effect-requirement-type-not-erased` → append to `groups/45.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.18)
- `deferred-callback-owns-its-context` → append to `groups/46.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.28), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.15)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/47.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.55), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.28)
- `no-casts` → append to `groups/48.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.23)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.22)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.40), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.35), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.41)
- `no-mixed-promise-effect-lifecycle` → append to `groups/42.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.38)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.26), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.32), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.18)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.53), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.17), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.23)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.36), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.27), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.20)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.36), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.24), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.27)
- `dependency-direction` → append to `groups/20.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.59), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.23), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.22)
- `state-owned-once` → append to `groups/21.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.31)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.48), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.26), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.28)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.24), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.18), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.17)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.50), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.36), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.38)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` (p=0.54), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.16), `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.17)
- `parent-ref-backs-parent-pointer` → append to `groups/41.md`: `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.26)
- `test-real-scenario-not-narrower-proxy` → append to `groups/53.md`: `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts` (p=0.26)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.18)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` (p=0.31)
