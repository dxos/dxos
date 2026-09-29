# System One pass — .agents/reviews/c4301eb1

- model: jev-latest
- base for context: `914c396d8bf54b43187956c36fc6b266aeba18f6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 34 uncertain, 41 clean, 0 unanswered

```text
requests: 44 (22 verdicts re-asked with context the model requested)
estimated input tokens: 391332
billed input tokens: 378499 (cost $0.0159)
measured chars per token: 3.10
```

## Still needs an agentic reviewer

Spawn one subagent per line below (27 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.20)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.35), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.30)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.32), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.22)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.36), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.56)
- `bounded-live-state` → append to `groups/43.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.26), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.40)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.16), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.20)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.15), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.30)
- `reuse-shared-test-layer` → append to `groups/45.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.27)
- `test-real-scenario-not-narrower-proxy` → append to `groups/46.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.45)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.41), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.23)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.40), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.27), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.33)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.17), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.20)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.21), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.33)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.25), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.35)
- `use-context-scoped-cancellation` → append to `groups/29.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.69)
- `collapse-branches-via-identity-element` → append to `groups/34.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.20)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.23)
- `lifecycle-owned-by-its-resource` → append to `groups/27.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.16)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.27)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.16)
- `diff-scoped-to-pr-purpose` → append to `groups/44.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.47)
