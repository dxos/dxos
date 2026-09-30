# System One pass — .agents/reviews/8c5219f5

- model: jev-latest
- base for context: `f96f3bd58a682aaaadce67af9f483a387a4f867b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 53 uncertain, 166 clean, 0 unanswered

```text
requests: 116 (34 verdicts re-asked with context the model requested)
estimated input tokens: 453068
billed input tokens: 414091 (cost $0.0174)
measured chars per token: 3.28
```

## Still needs an agentic reviewer

Spawn one subagent per line below (29 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.50)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.19)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.44), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.52), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.50), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.44)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.28), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.test.ts` (p=0.17), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.23), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.25)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.19), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.23), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.23), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.29)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.25), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.25)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.25), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.48), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.test.ts` (p=0.20), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.29)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.23), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.42), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.22)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/tauri/index.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.20), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.16)
- `follow-existing-lazy-loading-pattern` → append to `groups/34.md`: `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.20), `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.18)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.25), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.21)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.30)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.16)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.65)
- `use-context-scoped-cancellation` → append to `groups/30.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.75)
- `deferred-callback-owns-its-context` → append to `groups/42.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.23)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.17)
- `no-mixed-promise-effect-lifecycle` → append to `groups/40.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.35)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.16), `packages/apps/composer-app/vite.config.ts` (p=0.48)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.18), `packages/plugins/plugin-sandbox/src/tauri/unsupported.ts` (p=0.20)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.20)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-sandbox/src/tauri/local-launcher.ts` (p=0.30)
- `moon-yml-entrypoint-registration` → append to `groups/48.md`: `packages/plugins/plugin-sandbox/package.json` (p=0.71)
- `diff-scoped-to-pr-purpose` → append to `groups/47.md`: `packages/apps/composer-app/vite.config.ts` (p=0.26)
