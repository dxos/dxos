# System One pass — .agents/reviews/82a33b66

- model: jev-latest
- base for context: `27cac57685b67378a2ab55ad88792a748a297271`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 79 uncertain, 177 clean, 0 unanswered

```text
requests: 144 (43 verdicts re-asked with context the model requested)
estimated input tokens: 615368
billed input tokens: 579340 (cost $0.0243)
measured chars per token: 3.19
```

## Still needs an agentic reviewer

Spawn one subagent per line below (39 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.32), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.27), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.26), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.55)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.33), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.18), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.15), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.30)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.29), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.26), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.17)
- `no-invented-theme-tokens` → append to `groups/56.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.28)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.32)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.36), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.24), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.40), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.39), `packages/sdk/worker-framework/src/stories/modules/vector.ts` (p=0.15), `packages/apps/composer-app/vite.config.ts` (p=0.44)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.17), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.26), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.54), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.25)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.26), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.25), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.24), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.17)
- `dependency-direction` → append to `groups/20.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.25)
- `state-owned-once` → append to `groups/21.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.16), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.16)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.16), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.22), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.18)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx` (p=0.71), `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.42), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.49), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.44), `packages/sdk/worker-framework/src/stories/module-url.d.ts` (p=0.30), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.21), `packages/sdk/worker-framework/src/stories/modules/vector.ts` (p=0.26)
- `no-mixed-promise-effect-lifecycle` → append to `groups/40.md`: `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.49), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.49)
- `test-real-scenario-not-narrower-proxy` → append to `groups/52.md`: `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.26)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/sdk/worker-framework/src/stories/dynamic-modules.browser.test.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.15), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.16), `packages/sdk/worker-framework/src/stories/modules/vector.ts` (p=0.54)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.15), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.20)
- `consistent-private-field-convention` → append to `groups/15.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.15)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.33), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.37)
- `effect-requirement-type-not-erased` → append to `groups/42.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.57)
- `deferred-callback-owns-its-context` → append to `groups/43.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.16)
- `errors-extend-base-error` → append to `groups/36.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.16)
- `canonical-api-surface` → append to `groups/24.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.23)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.20), `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.18)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/sdk/worker-framework/src/stories/module-host-connection.ts` (p=0.19), `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.16)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.27)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.17)
- `bounded-live-state` → append to `groups/47.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.21)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/44.md`: `packages/sdk/worker-framework/src/stories/module-host-worker.ts` (p=0.71)
- `functions-before-classes` → append to `groups/26.md`: `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.45)
- `comment-hygiene` → append to `groups/03.md`: `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.18)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/sdk/worker-framework/src/stories/modules/geometry.ts` (p=0.23), `packages/sdk/worker-framework/src/stories/modules/vector.ts` (p=0.23)
- `diff-scoped-to-pr-purpose` → append to `groups/49.md`: `packages/apps/composer-app/vite.config.ts` (p=0.16)
