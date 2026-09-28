# System One pass — .agents/reviews/40b2a8e832

- model: jev-latest
- base for context: `91d8fd72b2f298150d6a1aefb53b2c9c819d406f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 76 uncertain, 99 clean, 0 unanswered

```text
requests: 112 (49 verdicts re-asked with context the model requested)
estimated input tokens: 576125
billed input tokens: 550370 (cost $0.0231)
measured chars per token: 3.14
```

## Still needs an agentic reviewer

Spawn one subagent per line below (38 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 19 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 27 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 28 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 29 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 31 as staged in STAGING.md
- `no-pointless-indirection` → append to `groups/22.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.16), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.47), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.23), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.32), `packages/ui/react-ui/src/next/components.tsx` (p=0.23)
- `bounded-live-state` → append to `groups/43.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.16)
- `event-handler-naming-convention` → append to `groups/12.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.15), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.40)
- `import-as-namespace-is-all-or-nothing` → append to `groups/35.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.53), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.25), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.39)
- `barrel-imports-not-internal-paths` → append to `groups/14.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.40), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.27), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.19), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.18), `packages/ui/react-ui/src/next/components.tsx` (p=0.29)
- `name-for-general-behavior` → append to `groups/07.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.16), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.34), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.25), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.30), `packages/ui/react-ui/src/next/components.tsx` (p=0.41)
- `dependency-direction` → append to `groups/20.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.16), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.30), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.16)
- `story-for-new-ui-component` → append to `groups/54.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components.tsx` (p=0.28)
- `co-locate-tightly-coupled-code` → append to `groups/08.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.17), `packages/ui/react-ui/src/next/components.tsx` (p=0.29)
- `consistent-file-naming-within-folder` → append to `groups/09.md`: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.stories.tsx` (p=0.65), `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.39), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.37), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.46), `packages/ui/react-ui/src/next/components.tsx` (p=0.35)
- `no-impossible-state-handling` → append to `groups/23.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.21), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.29), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.27)
- `inject-dependencies-via-constructor` → append to `groups/25.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.36)
- `collapse-branches-via-identity-element` → append to `groups/33.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.30), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.48)
- `comment-hygiene` → append to `groups/03.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.16), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.17), `packages/ui/react-ui/src/next/components.tsx` (p=0.34)
- `namespace-brand-key-prefixing` → append to `groups/11.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.29), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.18)
- `flat-layer-composition` → append to `groups/39.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.28)
- `standalone-service-accessor` → append to `groups/40.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.58)
- `effect-fn-not-hand-wrapped-gen` → append to `groups/42.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.77)
- `keep-parallel-apis-structurally-aligned` → append to `groups/13.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.17), `packages/ui/react-ui/src/next/components.tsx` (p=0.19)
- `no-mixed-promise-effect-lifecycle` → append to `groups/38.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.38)
- `no-trivial-wrappers-over-official-apis` → append to `groups/34.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.31), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.17)
- `prefer-branded-types-over-raw-primitives` → append to `groups/01.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.49), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.23), `packages/ui/react-ui/src/next/components.tsx` (p=0.32)
- `options-object-with-defaults` → append to `groups/06.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.25), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.27), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.34), `packages/ui/react-ui/src/next/components.tsx` (p=0.19)
- `jsdoc-non-obvious-identifiers` → append to `groups/04.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.33), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.31), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.37), `packages/ui/react-ui/src/next/components.tsx` (p=0.15)
- `consistent-field-and-list-ordering` → append to `groups/05.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.23), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.15)
- `dont-leak-internal-api-through-public-surface` → append to `groups/02.md`: `packages/plugins/plugin-debug/src/containers/DebugConsole/cli.ts` (p=0.24), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.16), `packages/ui/react-ui/src/next/components.tsx` (p=0.22)
- `schema-field-uses-platform-reference-mechanism` → append to `groups/36.md`: `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.test.ts` (p=0.19), `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.17)
- `state-owned-once` → append to `groups/21.md`: `packages/ui/react-ui-trace/src/session-timeline/gantt-mapping.ts` (p=0.16)
- `deprecated-tag-must-be-accurate` → append to `groups/17.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.19)
- `themed-primitives-take-classNames` → append to `groups/50.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.63)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/55.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.51)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/57.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.30)
- `structural-regions-use-design-system-components` → append to `groups/53.md`: `packages/ui/react-ui/src/next/components.tsx` (p=0.22)
