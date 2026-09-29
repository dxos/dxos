# System One pass — .agents/reviews/90213fe2

- model: jev-latest
- base for context: `a2021ca16b21d0cb8885c57ed88294d542589346`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 68 uncertain, 75 clean, 0 unanswered

```text
requests: 95 (43 verdicts re-asked with context the model requested)
estimated input tokens: 503790
billed input tokens: 481766 (cost $0.0202)
measured chars per token: 3.14
```

## Still needs an agentic reviewer

Spawn one subagent per line below (36 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 26 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.33), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.26), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.24)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.35), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.20), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.26)
- `inject-dependencies-via-constructor` → append to `groups/24.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.58), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.35)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.33)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.44), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.28), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.38), `packages/ui/ui-types/src/anchor.ts` (p=0.73)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.39), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.31), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.39)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.34), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.42)
- `standalone-service-accessor` → append to `groups/42.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.37)
- `effect-requirement-type-not-erased` → append to `groups/43.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.20), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.15)
- `deferred-callback-owns-its-context` → append to `groups/44.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.18)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.23), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.17)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.22), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.32), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.41), `packages/ui/ui-types/src/anchor.ts` (p=0.25)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.22), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.34), `packages/ui/ui-types/src/anchor.ts` (p=0.28)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.32), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.46), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.50), `packages/ui/ui-types/src/anchor.ts` (p=0.27)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.15), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.16)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.25), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.46), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.18)
- `state-owned-once` → append to `groups/21.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.16)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.38), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.38), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.79), `packages/ui/ui-types/src/anchor.ts` (p=0.69)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.17), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.22), `packages/ui/ui-types/src/anchor.ts` (p=0.19)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.17), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.19), `packages/ui/ui-types/src/anchor.ts` (p=0.15)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.36), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.21)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.18), `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.28), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.27), `packages/ui/ui-types/src/anchor.ts` (p=0.30)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.46), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.28)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/sdk/app-toolkit/src/ui/hooks/useObjectMenuItems.ts` (p=0.16), `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.28)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.30)
- `use-context-scoped-cancellation` → append to `groups/30.md`: `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.65)
- `comment-hygiene` → append to `groups/03.md`: `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.71)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/39.md`: `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.19)
- `lifecycle-owned-by-its-resource` → append to `groups/27.md`: `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts` (p=0.15)
- `no-casts` → append to `groups/46.md`: `packages/ui/ui-types/src/anchor.ts` (p=0.58)
- `diff-scoped-to-pr-purpose` → append to `groups/48.md`: `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts` (p=0.16)
