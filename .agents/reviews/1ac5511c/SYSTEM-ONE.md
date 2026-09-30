# System One pass — .agents/reviews/1ac5511c

- model: jev-latest
- base for context: `73c44a16dafde74103054776be09c91a37e64856`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 73 uncertain, 101 clean, 0 unanswered

```text
requests: 110 (42 verdicts re-asked with context the model requested)
estimated input tokens: 888101
billed input tokens: 835085 (cost $0.0351)
measured chars per token: 3.19
```

## Still needs an agentic reviewer

Spawn one subagent per line below (36 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/apps/composer-app/src/main.tsx` (p=0.29), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.23), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.27)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/apps/composer-app/src/main.tsx` (p=0.31), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.24), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.18)
- `error-messages-carry-context` → append to `groups/28.md`: `packages/apps/composer-app/src/main.tsx` (p=0.59)
- `collapse-branches-via-identity-element` → append to `groups/34.md`: `packages/apps/composer-app/src/main.tsx` (p=0.15)
- `bounded-live-state` → append to `groups/49.md`: `packages/apps/composer-app/src/main.tsx` (p=0.33)
- `comment-hygiene` → append to `groups/03.md`: `packages/apps/composer-app/src/main.tsx` (p=0.34)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/apps/composer-app/src/main.tsx` (p=0.58), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.36), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.17)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/apps/composer-app/src/main.tsx` (p=0.55), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.44), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.58)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/apps/composer-app/src/main.tsx` (p=0.19), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.21)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/apps/composer-app/src/main.tsx` (p=0.57), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.31), `packages/apps/composer-app/src/workers/client-plugin.ts` (p=0.19), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.24), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.30)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/apps/composer-app/src/main.tsx` (p=0.59), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.20), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.21), `packages/apps/composer-app/vite.config.ts` (p=0.45)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/apps/composer-app/src/main.tsx` (p=0.20), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.34)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/apps/composer-app/src/main.tsx` (p=0.30), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.20), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.47), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.26)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/apps/composer-app/src/main.tsx` (p=0.41), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.27), `packages/apps/composer-app/src/workers/client-plugin.ts` (p=0.31), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.23), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.26)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/apps/composer-app/src/main.tsx` (p=0.20), `packages/apps/composer-app/src/workers/client-plugin.ts` (p=0.17), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.18)
- `state-owned-once` → append to `groups/21.md`: `packages/apps/composer-app/src/main.tsx` (p=0.15)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/apps/composer-app/src/main.tsx` (p=0.35)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/apps/composer-app/src/main.tsx` (p=0.37), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.17), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.38)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/apps/composer-app/src/main.tsx` (p=0.31), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.24)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/apps/composer-app/src/main.tsx` (p=0.17)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/apps/composer-app/src/main.tsx` (p=0.29), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.35), `packages/apps/composer-app/src/workers/client-plugin.ts` (p=0.17), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.23), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.35)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/apps/composer-app/src/main.tsx` (p=0.21), `packages/apps/composer-app/src/util/automerge-wasm.ts` (p=0.15), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.27)
- `dependency-direction` → append to `groups/20.md`: `packages/apps/composer-app/src/workers/client-plugin.ts` (p=0.15), `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.16), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.18)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.28), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.30)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.48), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.50)
- `flat-layer-composition` → append to `groups/43.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.45), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.75)
- `deferred-callback-owns-its-context` → append to `groups/46.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.28), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.33)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/47.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.52), `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.37)
- `follow-existing-lazy-loading-pattern` → append to `groups/33.md`: `packages/apps/composer-app/src/workers/observability-plugin.ts` (p=0.21)
- `standalone-service-accessor` → append to `groups/44.md`: `packages/sdk/app-framework/src/worker/PluginWorker.ts` (p=0.15)
- `diff-scoped-to-pr-purpose` → append to `groups/50.md`: `packages/apps/composer-app/src/main.tsx` (p=0.47)
