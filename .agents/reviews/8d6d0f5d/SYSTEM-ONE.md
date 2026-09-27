# System One pass — .agents/reviews/8d6d0f5d

- model: jev-latest
- base for context: `8c5219f507b8217466f11c48b0a7b599e19661f7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 89 uncertain, 178 clean, 0 unanswered

```text
requests: 146 (50 verdicts re-asked with context the model requested)
estimated input tokens: 1079542
billed input tokens: 1007640 (cost $0.0423)
measured chars per token: 3.21
```

## Still needs an agentic reviewer

Spawn one subagent per line below (42 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.27), `packages/sdk/app-framework/src/core/capability.ts` (p=0.30), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.33), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.35)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.45), `packages/sdk/app-framework/src/core/capability.ts` (p=0.22), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.37)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.17), `packages/sdk/app-framework/src/core/capability.ts` (p=0.16)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.46), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.42), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.52), `packages/sdk/app-framework/src/core/capability.ts` (p=0.28), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.25), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.test.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.22), `packages/sdk/app-framework/src/core/capability.ts` (p=0.31), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.32), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.35)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.17)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.24)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.22), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.25), `packages/sdk/app-framework/src/core/capability.ts` (p=0.19), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.21)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.46), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.test.ts` (p=0.17), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.45), `packages/sdk/app-framework/src/core/capability.ts` (p=0.54), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.20), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.22)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.45), `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.37), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.22), `packages/sdk/app-framework/src/core/capability.ts` (p=0.50), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.18)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.31), `packages/sdk/app-framework/src/core/capability.ts` (p=0.20), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.37), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.52)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.16), `packages/sdk/app-framework/src/core/capability.ts` (p=0.20)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.61)
- `use-context-scoped-cancellation` → append to `groups/30.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.78)
- `deferred-callback-owns-its-context` → append to `groups/47.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.25), `packages/sdk/app-framework/src/core/capability.ts` (p=0.18)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.26), `packages/sdk/app-framework/src/core/capability.ts` (p=0.33)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.28), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.15), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.23)
- `no-mixed-promise-effect-lifecycle` → append to `groups/42.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.33), `packages/sdk/app-framework/src/core/capability.ts` (p=0.22)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.15), `packages/sdk/app-framework/src/core/capability.ts` (p=0.32), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.41), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.26)
- `lifecycle-owned-by-its-resource` → append to `groups/28.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.19)
- `follow-existing-lazy-loading-pattern` → append to `groups/34.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.17), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.20)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-sandbox/src/capabilities/local-launcher.ts` (p=0.27), `packages/sdk/app-framework/src/core/capability.ts` (p=0.50), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.27)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.54)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.24), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.27)
- `comment-hygiene` → append to `groups/03.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.44), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.24)
- `flat-layer-composition` → append to `groups/43.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.37)
- `effect-requirement-type-not-erased` → append to `groups/45.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.78)
- `schema-declare-and-brand` → append to `groups/46.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.48)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.39)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/sdk/app-framework/src/core/capability.ts` (p=0.26), `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.18), `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.17)
- `reuse-shared-test-layer` → append to `groups/57.md`: `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.15)
- `test-real-scenario-not-narrower-proxy` → append to `groups/58.md`: `packages/sdk/app-framework/src/plugin-cli/generate.test.ts` (p=0.18)
- `schema-persists-source-not-derived-duplicate` → append to `groups/41.md`: `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.15)
- `query-capability-extends-filter-query-dsl` → append to `groups/40.md`: `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.16)
- `state-owned-once` → append to `groups/21.md`: `packages/sdk/app-framework/src/plugin-cli/generate.ts` (p=0.16)
- `moon-yml-entrypoint-registration` → append to `groups/56.md`: `packages/plugins/plugin-sandbox/package.json` (p=0.77)
- `diff-scoped-to-pr-purpose` → append to `groups/55.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.25)
