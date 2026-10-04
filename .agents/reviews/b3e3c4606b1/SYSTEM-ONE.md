# System One pass — .agents/reviews/b3e3c4606b1

- model: jev-latest
- base for context: `c0356921d5591ee55a2d51413f0c0c86cef53495`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 88 uncertain, 134 clean, 0 unanswered

```text
requests: 133 (56 verdicts re-asked with context the model requested)
estimated input tokens: 766156
billed input tokens: 708826 (cost $0.0298)
measured chars per token: 3.24
```

## Still needs an agentic reviewer

Spawn one subagent per line below (33 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.28), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.25), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.35), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.21), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.21), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.26)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.21), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.25), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.16), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.23)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.28), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.28), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.20), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.29), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.29)
- `error-messages-carry-context` → append to `groups/27.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.37), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.22)
- `bounded-live-state` → append to `groups/46.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.24), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.25), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.32)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.26), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.26), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.26), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.16)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.58), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.66), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.42)
- `reuse-shared-test-layer` → append to `groups/48.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.44), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.23)
- `test-real-scenario-not-narrower-proxy` → append to `groups/49.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.31), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.48)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.29), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.17), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.33), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.56), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.19), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.18)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.27), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.38), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.39), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.20), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.32), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.34)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.24), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.22), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.25), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.37), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.28)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.20), `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.37), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.23), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.19), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.32), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.27)
- `schema-persists-source-not-derived-duplicate` → append to `groups/40.md`: `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.20)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.15), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.19)
- `state-owned-once` → append to `groups/21.md`: `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.15), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.16)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/apps/composer-app/src/util/preload-recovery.ts` (p=0.25), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.42), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.23), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.30)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.17), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.79)
- `import-as-namespace-is-all-or-nothing` → append to `groups/36.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.45), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.33), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.31)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.21), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.28)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.29), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.26), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.17)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.26), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.29), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.23)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.18), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.16), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.16)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.43), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.22), `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.34), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.22)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/44.md`: `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.test.ts` (p=0.15)
- `no-mixed-promise-effect-lifecycle` → append to `groups/41.md`: `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.33)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-space/src/capabilities/settings-sync/binding.ts` (p=0.30), `packages/sdk/app-framework/src/vite-plugin/composer/index.ts` (p=0.20)
- `diff-scoped-to-pr-purpose` → append to `groups/47.md`: `packages/apps/composer-app/src/util/preload-recovery.test.ts` (p=0.20)
