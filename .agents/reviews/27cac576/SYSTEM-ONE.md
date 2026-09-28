# System One pass — .agents/reviews/27cac576

- model: jev-latest
- base for context: `f96f3bd58a682aaaadce67af9f483a387a4f867b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 95 uncertain, 253 clean, 0 unanswered

```text
requests: 177 (57 verdicts re-asked with context the model requested)
estimated input tokens: 666711
billed input tokens: 618035 (cost $0.0260)
measured chars per token: 3.24
```

## Still needs an agentic reviewer

Spawn one subagent per line below (39 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.44), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.28), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.33), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.37), `packages/sdk/worker-framework/src/stories/modules/realm.ts` (p=0.19)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.34), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.15), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.16), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.32)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.17)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.28), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.20)
- `no-invented-theme-tokens` → append to `groups/53.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.27)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.29)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.37), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.38), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.36)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.16), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.15)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.22), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.51), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.28), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.25)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.35), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.25), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.30), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.21), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.21), `packages/sdk/worker-framework/src/stories/modules/realm.ts` (p=0.21), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.15)
- `dependency-direction` → append to `groups/20.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.35)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.17), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.17), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/modules/math.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.23)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.23), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.23)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.71), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.45), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.40), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.35), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.36), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.38), `packages/sdk/worker-framework/src/stories/module-url.d.ts` (p=0.21), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.15)
- `no-mixed-promise-effect-lifecycle` → append to `groups/40.md`: `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.50), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.52)
- `test-real-scenario-not-narrower-proxy` → append to `groups/49.md`: `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.31)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.18)
- `functions-before-classes` → append to `groups/26.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.17)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.15), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.30), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.16), `packages/sdk/worker-framework/src/stories/module-url.d.ts` (p=0.19)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.15)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.33), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.32)
- `effect-requirement-type-not-erased` → append to `groups/42.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.51)
- `deferred-callback-owns-its-context` → append to `groups/43.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.17)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.25), `packages/sdk/worker-framework/src/stories/modules/math.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.22)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.54), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.38), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/modules/realm.ts` (p=0.22)
- `canonical-api-surface` → append to `groups/24.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.22)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.18), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.28), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.17)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/modules/realm.ts` (p=0.19)
- `comment-hygiene` → append to `groups/03.md`: `packages/sdk/worker-framework/src/stories/module-host-constants.ts` (p=0.17), `packages/sdk/worker-framework/src/stories/modules/realm.ts` (p=0.19)
- `schema-persists-source-not-derived-duplicate` → append to `groups/39.md`: `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.34)
- `no-casts` → append to `groups/45.md`: `packages/sdk/worker-framework/src/stories/module-host-service.ts` (p=0.61)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.32)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/44.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.58)
- `follow-existing-lazy-loading-pattern` → append to `groups/32.md`: `packages/sdk/worker-framework/src/stories/modules/math.ts` (p=0.16), `packages/sdk/worker-framework/src/stories/modules/text.ts` (p=0.16)
