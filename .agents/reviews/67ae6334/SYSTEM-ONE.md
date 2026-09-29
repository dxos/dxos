# System One pass — .agents/reviews/67ae6334

- model: jev-latest
- base for context: `f3c02b30ea43d85615186056e033adb200e25259`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 32 uncertain, 43 clean, 0 unanswered

```text
requests: 43 (20 verdicts re-asked with context the model requested)
estimated input tokens: 370666
billed input tokens: 357051 (cost $0.0150)
measured chars per token: 3.11
```

## Still needs an agentic reviewer

Spawn one subagent per line below (28 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.24)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.31), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.29)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.31), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.21)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.33), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.43)
- `bounded-live-state` → append to `groups/43.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.23), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.36)
- `reuse-shared-test-layer` → append to `groups/45.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.30)
- `test-real-scenario-not-narrower-proxy` → append to `groups/46.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.51)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.42), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.18)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.38), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.18)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.28), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.34)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.23), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.31)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.23), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.33)
- `use-context-scoped-cancellation` → append to `groups/29.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.70)
- `collapse-branches-via-identity-element` → append to `groups/34.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.27)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.16)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.23)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.29)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.19)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.17)
- `lifecycle-owned-by-its-resource` → append to `groups/27.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.17)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.26)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.17)
- `diff-scoped-to-pr-purpose` → append to `groups/44.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.16)
