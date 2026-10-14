# System One pass — .agents/reviews/c0356921d55

- model: jev-latest
- base for context: `6090338a1117ab9fd7cf4414125005e106671ca0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 49 uncertain, 66 clean, 0 unanswered

```text
requests: 70 (35 verdicts re-asked with context the model requested)
estimated input tokens: 452741
billed input tokens: 408806 (cost $0.0172)
measured chars per token: 3.32
```

## Still needs an agentic reviewer

Spawn one subagent per line below (36 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 30 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 32 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.21), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.34), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.24)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.54), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.18), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.23)
- `error-messages-carry-context` → append to `groups/28.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.52)
- `batch-queries-not-n-plus-1` → append to `groups/33.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.34)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.47), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.50)
- `flat-layer-composition` → append to `groups/42.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.32)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.20), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.21)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.39), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.31)
- `no-mixed-promise-effect-lifecycle` → append to `groups/41.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.45)
- `test-real-scenario-not-narrower-proxy` → append to `groups/48.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.29)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.56), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.20), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.17)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.23), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.39), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.30)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.25), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.49), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.20)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.17), `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.26), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.27)
- `test-asserts-real-behavior` → append to `groups/49.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.18)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.15)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.16)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.27)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.30)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.25), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.26)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.17)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.25), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.34)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.ts` (p=0.38), `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.16)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.23)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.30)
- `write-through-the-live-object` → append to `groups/53.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.28)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/59.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.30)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.21)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.32)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-registry/src/components/RegistrySettings/RegistrySettings.tsx` (p=0.25)
- `diff-scoped-to-pr-purpose` → append to `groups/46.md`: `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts` (p=0.20)
