# System One pass — .agents/reviews/914c396d

- model: jev-latest
- base for context: `f3c02b30ea43d85615186056e033adb200e25259`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 59 uncertain, 124 clean, 0 unanswered

```text
requests: 102 (38 verdicts re-asked with context the model requested)
estimated input tokens: 720334
billed input tokens: 693671 (cost $0.0291)
measured chars per token: 3.12
```

## Still needs an agentic reviewer

Spawn one subagent per line below (29 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.47), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.24), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.16), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.25), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.27)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.33), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.27)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.39), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.48), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.22)
- `bounded-live-state` → append to `groups/46.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.28), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.41)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.15), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.20)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.18), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.33), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.22)
- `reuse-shared-test-layer` → append to `groups/48.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.31), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.52)
- `test-real-scenario-not-narrower-proxy` → append to `groups/49.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.47), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.40)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.36), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.23), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.39), `packages/apps/composer-app/vite.config.ts` (p=0.47)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.38), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.17), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.34), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.16), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.27), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.33), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.39), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.21), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.32)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.24), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.31), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.17), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.16)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.25), `packages/apps/composer-app/src/functions/_worker.ts` (p=0.36), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.37), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.24), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.24)
- `use-context-scoped-cancellation` → append to `groups/30.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.67)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.21), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.32)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.20)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.18)
- `lifecycle-owned-by-its-resource` → append to `groups/27.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.15)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.26)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/apps/composer-app/src/functions/_worker.ts` (p=0.16), `packages/apps/composer-app/src/util/rss-proxy.ts` (p=0.23), `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.24), `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.27)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-magazine/src/operations/sources/http.ts` (p=0.15)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.17)
- `test-asserts-real-behavior` → append to `groups/50.md`: `packages/plugins/plugin-magazine/src/operations/sources/rss.test.ts` (p=0.17)
- `diff-scoped-to-pr-purpose` → append to `groups/47.md`: `packages/apps/composer-app/src/functions/_worker.test.ts` (p=0.24)
