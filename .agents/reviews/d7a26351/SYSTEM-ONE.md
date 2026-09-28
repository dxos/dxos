# System One pass — .agents/reviews/d7a26351

- model: jev-latest
- base for context: `92cd1664378c66718239bae3af4ddf691539c39f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 121 uncertain, 894 clean, 0 unanswered

```text
requests: 425 (96 verdicts re-asked with context the model requested)
estimated input tokens: 2186932
billed input tokens: 2022967 (cost $0.0850)
measured chars per token: 3.24
```

## Still needs an agentic reviewer

Spawn one subagent per line below (51 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 38, 39 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 53, 54 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 57, 58 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 61, 62 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 65, 66 as staged in STAGING.md
- `jsdoc-non-obvious-identifiers` → append to `groups/08.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.ts` (p=0.33), `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.37), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.58), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.43)
- `options-object-with-defaults` → append to `groups/12.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.ts` (p=0.58), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.41)
- `no-impossible-state-handling` → append to `groups/47.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.ts` (p=0.27), `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.30), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.52)
- `error-messages-carry-context` → append to `groups/55.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.ts` (p=0.36), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.53), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.53)
- `no-mixed-promise-effect-lifecycle` → append to `groups/84.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.ts` (p=0.59), `packages/plugins/plugin-sandbox/src/testing/probe.ts` (p=0.50), `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.32), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.38), `packages/plugins/plugin-sandbox/src/local/server.test.ts` (p=0.59), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.52), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.29)
- `scope-multi-tenant-queries-by-space` → append to `groups/64.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.66), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.23)
- `flat-layer-composition` → append to `groups/85.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.64), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.65), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.35), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.62)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/91.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.77), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.35), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.49), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/server.test.ts` (p=0.50)
- `test-real-scenario-not-narrower-proxy` → append to `groups/103.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.41), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.41), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/local/server.test.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.22)
- `no-env-vars-in-low-level-modules` → append to `groups/35.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.24), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.30), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.17), `packages/plugins/plugin-sandbox/src/testing/probe.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.32), `packages/plugins/plugin-sandbox/src/local/index.ts` (p=0.17), `packages/plugins/plugin-sandbox/src/local/server.test.ts` (p=0.28), `packages/plugins/plugin-sandbox/src/local/sidecar-main.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.29)
- `test-asserts-real-behavior` → append to `groups/104.md`: `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.29), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.24), `packages/plugins/plugin-sandbox/src/local/server.test.ts` (p=0.22), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.30)
- `inject-dependencies-via-constructor` → append to `groups/50.md`: `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.34), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.42)
- `import-as-namespace-is-all-or-nothing` → append to `groups/78.md`: `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.76), `packages/plugins/plugin-sandbox/src/services/index.ts` (p=0.70), `packages/plugins/plugin-sandbox/src/types/SandboxCapabilities.ts` (p=0.72), `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.56), `packages/plugins/plugin-sandbox/src/types/Settings.ts` (p=0.64), `packages/plugins/plugin-sandbox/src/index.ts` (p=0.70)
- `dont-leak-internal-api-through-public-surface` → append to `groups/04.md`: `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts` (p=0.62), `packages/plugins/plugin-sandbox/src/services/index.ts` (p=0.49), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.51), `packages/plugins/plugin-sandbox/src/types/SandboxCapabilities.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.46), `packages/plugins/plugin-sandbox/src/types/Settings.ts` (p=0.66), `packages/plugins/plugin-sandbox/src/types/index.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/index.ts` (p=0.53), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.40)
- `bounded-live-state` → append to `groups/97.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.19), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.48), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.59)
- `reuse-shared-test-layer` → append to `groups/102.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.17)
- `no-sleep-in-test` → append to `groups/92.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.57), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.79)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/105.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.18), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.19)
- `keep-parallel-apis-structurally-aligned` → append to `groups/26.md`: `packages/plugins/plugin-sandbox/src/testing/probe.ts` (p=0.46)
- `reuse-existing-mechanism` → append to `groups/37.md`: `packages/plugins/plugin-sandbox/src/testing/probe.ts` (p=0.29)
- `namespace-brand-key-prefixing` → append to `groups/22.md`: `packages/plugins/plugin-sandbox/src/types/SandboxCapabilities.ts` (p=0.27), `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/types/Settings.ts` (p=0.32), `packages/plugins/plugin-native/src/capabilities/index.ts` (p=0.43)
- `dependency-direction` → append to `groups/41.md`: `packages/plugins/plugin-sandbox/src/types/SandboxCapabilities.ts` (p=0.35)
- `no-precision-loss-on-generic-refactor` → append to `groups/20.md`: `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.32)
- `consistent-field-and-list-ordering` → append to `groups/09.md`: `packages/plugins/plugin-native/src/capabilities/index.ts` (p=0.36), `packages/plugins/plugin-native/src/plugin.tsx` (p=0.35)
- `use-context-scoped-cancellation` → append to `groups/60.md`: `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.70)
- `deferred-callback-owns-its-context` → append to `groups/89.md`: `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.24), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.25)
- `barrel-imports-not-internal-paths` → append to `groups/27.md`: `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.41)
- `lifecycle-owned-by-its-resource` → append to `groups/56.md`: `packages/plugins/plugin-native/src/capabilities/sandbox-launcher.ts` (p=0.18), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.19)
- `follow-existing-lazy-loading-pattern` → append to `groups/69.md`: `packages/plugins/plugin-sandbox/src/capabilities/sandbox-service.ts` (p=0.28)
- `no-trivial-wrappers-over-official-apis` → append to `groups/74.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.31), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.25)
- `name-for-general-behavior` → append to `groups/13.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.34)
- `consistent-file-naming-within-folder` → append to `groups/17.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.56), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.53)
- `collapse-branches-via-identity-element` → append to `groups/71.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.31)
- `effect-requirement-type-not-erased` → append to `groups/88.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.36)
- `no-casts` → append to `groups/93.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.17)
- `state-owned-once` → append to `groups/42.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.23)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.27)
- `event-handler-naming-convention` → append to `groups/23.md`: `packages/plugins/plugin-sandbox/src/local/server.ts` (p=0.24)
- `no-pointless-indirection` → append to `groups/44.md`: `packages/plugins/plugin-sandbox/src/local/sidecar.test.ts` (p=0.37)
- `moon-yml-entrypoint-registration` → append to `groups/101.md`: `packages/plugins/plugin-native/package.json` (p=0.28), `packages/plugins/plugin-sandbox/package.json` (p=0.79)
- `diff-scoped-to-pr-purpose` → append to `groups/99.md`: `packages/plugins/plugin-native/src/capabilities/index.ts` (p=0.20)
