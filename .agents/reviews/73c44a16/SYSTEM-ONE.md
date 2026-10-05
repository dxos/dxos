# System One pass — .agents/reviews/73c44a16

- model: jev-latest
- base for context: `6ec1c5f931a013a0364dd96c98238b72cdd03deb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 77 uncertain, 111 clean, 0 unanswered

```text
requests: 111 (45 verdicts re-asked with context the model requested)
estimated input tokens: 560985
billed input tokens: 507178 (cost $0.0213)
measured chars per token: 3.32
```

## Still needs an agentic reviewer

Spawn one subagent per line below (30 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 27 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 28 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 30 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.21), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.19), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.26), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.22), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.18)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.24), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.20)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.28), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.19), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.39), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.23)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.44), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.31), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.23), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.46), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.39)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.36), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.20), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.39), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.16), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.15)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.46), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.37), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.35), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.54), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.35)
- `flat-layer-composition` → append to `groups/41.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.39), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.55), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.54), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.76), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.66)
- `deferred-callback-owns-its-context` → append to `groups/44.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.26), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.16), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.21), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.31), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.22)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/45.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.65), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.77), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.34)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.27), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.22), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.24), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.28), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.30)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.52), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.46), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.30)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.24), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.24), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.29), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.25), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.16)
- `dependency-direction` → append to `groups/20.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.16), `packages/plugins/plugin-client/src/worker/client-services.ts` (p=0.23), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.17), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.16), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.15)
- `follow-existing-lazy-loading-pattern` → append to `groups/31.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.17)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.16), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.26), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.34)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.27), `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.50), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.39), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.33)
- `reuse-shared-test-layer` → append to `groups/47.md`: `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.25)
- `no-mixed-promise-effect-lifecycle` → append to `groups/40.md`: `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.56)
- `test-real-scenario-not-narrower-proxy` → append to `groups/48.md`: `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.45)
- `no-trivial-wrappers-over-official-apis` → append to `groups/33.md`: `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.17), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.23)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts` (p=0.20), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.31)
- `state-owned-once` → append to `groups/21.md`: `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.16)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.24)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.28), `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts` (p=0.17)
- `diff-scoped-to-pr-purpose` → append to `groups/46.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.37)
