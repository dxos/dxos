# System One pass — .agents/reviews/bbce297f25

- model: jev-latest
- base for context: `5e7d4ed265492720e0e27f4b02833862032f3c4a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 118 uncertain, 163 clean, 0 unanswered

```text
requests: 218 (85 verdicts re-asked with context the model requested)
estimated input tokens: 1931040
billed input tokens: 1939204 (cost $0.0814)
measured chars per token: 2.99
```

## Still needs an agentic reviewer

Spawn one subagent per line below (49 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 29 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 31 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 33 as staged in STAGING.md
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.15)
- `import-as-namespace-is-all-or-nothing` → append to `groups/37.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.28), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.55), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.40)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.19), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.18), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.18), `packages/ui/react-ui/src/next/sizes.ts` (p=0.16)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.19), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.38), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.41), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.31), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.18), `packages/ui/react-ui/src/next/components.tsx` (p=0.29)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.16), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.23), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.38), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.29), `packages/ui/react-ui/src/next/components.tsx` (p=0.25)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.15), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.16), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.22), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.43), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.34), `packages/ui/react-ui/src/next/components.tsx` (p=0.28), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.17), `packages/ui/react-ui/src/next/sizes.ts` (p=0.24)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.27), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.19), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.25)
- `follow-existing-lazy-loading-pattern` → append to `groups/34.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.18)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.18), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.24), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.37), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.31), `packages/ui/react-ui/src/next/components.tsx` (p=0.15)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.19), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.18), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.42), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.24), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.30), `packages/ui/react-ui/src/next/components.tsx` (p=0.26), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.27)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.25), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.68), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.26), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.64), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.48), `packages/ui/react-ui/src/next/components.tsx` (p=0.29), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.20), `packages/ui/react-ui/src/next/sizes.ts` (p=0.41)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.19), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.18), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.18), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.22), `packages/ui/react-ui/src/next/components.tsx` (p=0.22), `packages/ui/react-ui/src/next/sizes.ts` (p=0.28)
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.22), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.15), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.50), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.29), `packages/ui/react-ui/src/next/components.tsx` (p=0.28), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.23)
- `bounded-live-state` → append to `groups/47.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.22), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.20)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.15), `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.16), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components.tsx` (p=0.36)
- `story-for-new-ui-component` → append to `groups/60.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.49), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.20)
- `extract-non-rendering-logic-from-component` → append to `groups/61.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.76), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.67)
- `reactive-state-via-atom-bridge` → append to `groups/64.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.30), `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.20)
- `business-logic-out-of-ui` → append to `groups/24.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (p=0.19)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.61), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.20)
- `dont-recompute-in-reactive-closures` → append to `groups/30.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.16)
- `collapse-branches-via-identity-element` → append to `groups/35.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.23), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.20)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.64), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.39)
- `inline-obj-parent` → append to `groups/38.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.57)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/40.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.17)
- `themed-primitives-take-classNames` → append to `groups/52.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.37), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.23), `packages/ui/react-ui/src/next/components.tsx` (p=0.36)
- `no-invented-theme-tokens` → append to `groups/53.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.17), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.45)
- `subscribe-where-you-read` → append to `groups/56.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.71)
- `leaf-owns-its-subscription` → append to `groups/57.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.49)
- `write-through-the-live-object` → append to `groups/58.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.40)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/65.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.31), `packages/ui/react-ui/src/next/components.tsx` (p=0.28), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.34)
- `no-hand-rolled-lists` → append to `groups/55.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.20), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.26)
- `structural-regions-use-design-system-components` → append to `groups/59.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.21), `packages/ui/react-ui/src/next/components.tsx` (p=0.24), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.22)
- `setter-must-not-own-transaction` → append to `groups/16.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.49)
- `no-trivial-wrappers-over-official-apis` → append to `groups/36.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.49)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.45), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.17), `packages/ui/react-ui/src/next/components.tsx` (p=0.30)
- `reuse-existing-mechanism` → append to `groups/18.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.19), `packages/ui/react-ui/src/next/components.tsx` (p=0.23), `packages/ui/react-ui/src/next/sizes.ts` (p=0.29)
- `state-owned-once` → append to `groups/21.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.33)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/62.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.53)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx` (p=0.30), `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.29)
- `no-precision-loss-on-generic-refactor` → append to `groups/10.md`: `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx` (p=0.16)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/63.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.40), `packages/ui/react-ui/src/next/experimental.stories.tsx` (p=0.59)
- `moon-yml-entrypoint-registration` → append to `groups/51.md`: `packages/plugins/plugin-canvas/package.json` (p=0.15)
- `diff-scoped-to-pr-purpose` → append to `groups/50.md`: `packages/plugins/plugin-canvas/src/capabilities/settings.ts` (p=0.26)
