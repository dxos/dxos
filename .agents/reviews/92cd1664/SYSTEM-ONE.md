# System One pass — .agents/reviews/92cd1664

- model: jev-latest
- base for context: `5662bbc3b0d2315aff7b697a0de1611f5f04fee7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 105 uncertain, 718 clean, 0 unanswered

```text
requests: 336 (78 verdicts re-asked with context the model requested)
estimated input tokens: 1794947
billed input tokens: 1663081 (cost $0.0698)
measured chars per token: 3.24
```

## Still needs an agentic reviewer

Spawn one subagent per line below (53 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 38, 39 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 52, 53 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 56, 57 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 60, 61 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 64, 65 as staged in STAGING.md
- `options-object-with-defaults` → append to `groups/12.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.38), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.45)
- `no-trivial-wrappers-over-official-apis` → append to `groups/72.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.24), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.33), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.36)
- `inject-dependencies-via-constructor` → append to `groups/49.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.36), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.30), `packages/plugins/plugin-sandbox/src/local/index.ts` (p=0.40)
- `import-as-namespace-is-all-or-nothing` → append to `groups/76.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.35), `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts` (p=0.29), `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.42), `packages/plugins/plugin-sandbox/src/skills/functions/exec.ts` (p=0.41), `packages/plugins/plugin-sandbox/src/skills/functions/upload-file.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.46), `packages/plugins/plugin-sandbox/src/types/SandboxOperation.ts` (p=0.67), `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.59), `packages/plugins/plugin-sandbox/src/types/index.ts` (p=0.58), `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.50), `packages/plugins/plugin-sandbox/src/capabilities/sandbox-service.ts` (p=0.33), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.20), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.43)
- `import-as-namespace-is-all-or-nothing` → append to `groups/76.md`: `packages/plugins/plugin-sandbox/src/local/index.ts` (p=0.42), `packages/plugins/plugin-sandbox/src/local/unsupported.ts` (p=0.47), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.55), `packages/plugins/plugin-sandbox/src/plugin.ts` (p=0.52)
- `flat-layer-composition` → append to `groups/87.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.63), `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.57), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.64), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.31)
- `effect-requirement-type-not-erased` → append to `groups/90.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.18)
- `keep-parallel-apis-structurally-aligned` → append to `groups/26.md`: `packages/plugins/plugin-sandbox/src/services/edge-backend.ts` (p=0.32), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.31)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/93.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.43), `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.58), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.15)
- `reuse-shared-test-layer` → append to `groups/105.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.35), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.18)
- `test-real-scenario-not-narrower-proxy` → append to `groups/106.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.27), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.39), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.30)
- `test-asserts-real-behavior` → append to `groups/107.md`: `packages/plugins/plugin-sandbox/src/services/layer.test.ts` (p=0.15), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.29), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.32)
- `no-impossible-state-handling` → append to `groups/47.md`: `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.25), `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.26), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.33), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.36)
- `no-env-vars-in-low-level-modules` → append to `groups/35.md`: `packages/plugins/plugin-sandbox/src/services/layer.ts` (p=0.20), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.16)
- `bounded-live-state` → append to `groups/99.md`: `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts` (p=0.76), `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.59), `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.46), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.58), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.64)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/82.md`: `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts` (p=0.21), `packages/plugins/plugin-sandbox/src/types/SandboxOperation.ts` (p=0.23)
- `schema-persists-source-not-derived-duplicate` → append to `groups/84.md`: `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts` (p=0.29), `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.19)
- `state-owned-once` → append to `groups/43.md`: `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts` (p=0.22), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.27)
- `parent-ref-backs-parent-pointer` → append to `groups/85.md`: `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.17)
- `inline-obj-parent` → append to `groups/79.md`: `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts` (p=0.72)
- `no-precision-loss-on-generic-refactor` → append to `groups/20.md`: `packages/plugins/plugin-sandbox/src/skills/functions/exec.ts` (p=0.21)
- `consistent-file-naming-within-folder` → append to `groups/18.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.50), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.49)
- `scope-multi-tenant-queries-by-space` → append to `groups/63.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.49), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.23), `packages/plugins/plugin-sandbox/src/plugin.local.test.ts` (p=0.66)
- `no-sleep-in-test` → append to `groups/94.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.60), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.77)
- `isolate-benchmark-setup-and-flaky-tests` → append to `groups/108.md`: `packages/plugins/plugin-sandbox/src/testing/LocalSandbox.test.ts` (p=0.16), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.19)
- `prefer-branded-types-over-raw-primitives` → append to `groups/02.md`: `packages/plugins/plugin-sandbox/src/types/SandboxOperation.ts` (p=0.57)
- `operations-take-refs-not-ids` → append to `groups/74.md`: `packages/plugins/plugin-sandbox/src/types/SandboxOperation.ts` (p=0.19)
- `jsdoc-non-obvious-identifiers` → append to `groups/08.md`: `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.29), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.56)
- `namespace-brand-key-prefixing` → append to `groups/22.md`: `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.33), `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.31)
- `dont-leak-internal-api-through-public-surface` → append to `groups/04.md`: `packages/plugins/plugin-sandbox/src/types/SandboxService.ts` (p=0.49), `packages/plugins/plugin-sandbox/src/types/index.ts` (p=0.40), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.43)
- `consistent-field-and-list-ordering` → append to `groups/09.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.25)
- `follow-existing-lazy-loading-pattern` → append to `groups/67.md`: `packages/plugins/plugin-sandbox/src/capabilities/sandbox-service.ts` (p=0.30)
- `no-mixed-promise-effect-lifecycle` → append to `groups/86.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts` (p=0.55), `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.39)
- `name-for-general-behavior` → append to `groups/13.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.36)
- `no-pointless-indirection` → append to `groups/44.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.43)
- `error-messages-carry-context` → append to `groups/54.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.42), `packages/plugins/plugin-sandbox/src/local/paths.ts` (p=0.19)
- `collapse-branches-via-identity-element` → append to `groups/69.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.35), `packages/plugins/plugin-sandbox/src/local/limits.ts` (p=0.20)
- `deferred-callback-owns-its-context` → append to `groups/91.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.27)
- `no-casts` → append to `groups/95.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.15)
- `lifecycle-owned-by-its-resource` → append to `groups/55.md`: `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts` (p=0.22)
- `reuse-existing-mechanism` → append to `groups/36.md`: `packages/plugins/plugin-sandbox/src/local/paths.ts` (p=0.28)
- `moon-yml-entrypoint-registration` → append to `groups/104.md`: `packages/plugins/plugin-sandbox/package.json` (p=0.79)
- `diff-scoped-to-pr-purpose` → append to `groups/102.md`: `packages/plugins/plugin-sandbox/src/capabilities/index.ts` (p=0.18)
