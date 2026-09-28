# System One pass — .agents/reviews/72b289bcfd6

- model: jev-latest
- base for context: `b63506be5884ac6b0666595d84d0196a7493a72c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 61 uncertain, 52 clean, 0 unanswered

```text
requests: 77 (37 verdicts re-asked with context the model requested)
estimated input tokens: 555475
billed input tokens: 518920 (cost $0.0218)
measured chars per token: 3.21
```

## Still needs an agentic reviewer

Spawn one subagent per line below (33 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 27 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 28 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.19), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.21), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.23)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.25), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.23), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.24)
- `functions-before-classes` → append to `groups/25.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.29)
- `construct-populated-dont-mutate-after` → append to `groups/30.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.40)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.37), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.16)
- `bounded-live-state` → append to `groups/44.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.57), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.32)
- `comment-hygiene` → append to `groups/03.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.39)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.48), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.62), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.70)
- `import-as-namespace-is-all-or-nothing` → append to `groups/36.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.50), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.40), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.45)
- `schema-persists-source-not-derived-duplicate` → append to `groups/40.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.15)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.20), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.24), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.22)
- `errors-extend-base-error` → append to `groups/37.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.15)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.50), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.23)
- `no-trivial-wrappers-over-official-apis` → append to `groups/35.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.19), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.17)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.21), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.31), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.40)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.28), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.28), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.17)
- `dependency-direction` → append to `groups/20.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.30), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.37), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.21)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.48), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.35), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.19)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.23), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.30), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.21)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.48), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.39), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.27)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/core/compute/compute/src/types/Project.ts` (p=0.34), `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.31), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.16)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.23), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.24)
- `scope-multi-tenant-queries-by-space` → append to `groups/29.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.22)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/39.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.17), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.15)
- `standalone-service-accessor` → append to `groups/41.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.35)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.32), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.22)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.21), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.20)
- `follow-existing-lazy-loading-pattern` → append to `groups/32.md`: `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts` (p=0.20), `packages/plugins/plugin-settings/src/capabilities/app-graph-builder.ts` (p=0.23)
