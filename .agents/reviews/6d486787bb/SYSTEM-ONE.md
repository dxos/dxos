# System One pass — .agents/reviews/6d486787bb

- model: jev-latest
- base for context: `a2021ca16b21d0cb8885c57ed88294d542589346`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 22 violations written to fragments, 101 uncertain, 1184 clean, 0 unanswered

```text
requests: 524 (42 verdicts re-asked with context the model requested)
estimated input tokens: 2241060
billed input tokens: 2082807 (cost $0.0875)
measured chars per token: 3.23
```

## Still needs an agentic reviewer

Spawn one subagent per line below (46 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 54, 55, 56 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 74, 75, 76 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 78, 79, 80 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 83, 84 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 87, 88, 89 as staged in STAGING.md
- `consistent-file-naming-within-folder` → append to `groups/25.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.33), `packages/ui/react-ui/src/next/Next.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Dialog/index.ts` (p=0.28), `packages/ui/react-ui/src/next/sizes.ts` (p=0.32), `packages/ui/react-ui/src/next/spike/Choices.stories.tsx` (p=0.70), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.38)
- `no-pointless-indirection` → append to `groups/63.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.40), `packages/ui/react-ui/src/next/Next.tsx` (p=0.42), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.39), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.40), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.39)
- `no-impossible-state-handling` → append to `groups/66.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.29), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.44), `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Input/Input.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.20), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.36), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.45)
- `error-messages-carry-context` → append to `groups/77.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.20), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.15)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/135.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.22), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.28), `packages/ui/react-ui/src/next/components/Block/Block.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.43), `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.21), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.19), `packages/ui/react-ui/src/next/spike/Choices.stories.tsx` (p=0.35), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.44)
- `consistent-field-and-list-ordering` → append to `groups/13.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.28)
- `deprecated-tag-must-be-accurate` → append to `groups/48.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.20)
- `reuse-existing-mechanism` → append to `groups/51.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.60), `packages/ui/react-ui/src/next/components/Block/Block.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/Container/Container.tsx` (p=0.40), `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/Icon/Icon.tsx` (p=0.50), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.50), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.38), `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx` (p=0.39)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/131.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.57), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.36)
- `no-trivial-wrappers-over-official-apis` → append to `groups/96.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.47), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.45)
- `comment-hygiene` → append to `groups/07.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.46), `packages/ui/react-ui/src/next/components/Container/Container.tsx` (p=0.52), `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.64), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.63), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.59), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.41)
- `no-hand-rolled-lists` → append to `groups/124.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/spike/Choices.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.28)
- `themed-primitives-take-classNames` → append to `groups/120.md`: `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.44), `packages/ui/react-ui/src/next/components/Label/Label.tsx` (p=0.52)
- `keep-parallel-apis-structurally-aligned` → append to `groups/36.md`: `packages/ui/react-ui/src/next/components/Checkbox/Checkbox.tsx` (p=0.33), `packages/ui/react-ui/src/next/components/Icon/Icon.tsx` (p=0.28), `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx` (p=0.34)
- `jsdoc-non-obvious-identifiers` → append to `groups/10.md`: `packages/ui/react-ui/src/next/components/Container/Container.tsx` (p=0.31), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.54)
- `extract-non-rendering-logic-from-component` → append to `groups/130.md`: `packages/ui/react-ui/src/next/components/Container/Container.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.17)
- `barrel-imports-not-internal-paths` → append to `groups/39.md`: `packages/ui/react-ui/src/next/components/Container/Container.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.30)
- `name-for-general-behavior` → append to `groups/19.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.37), `packages/ui/react-ui/src/next/components/Typography/Typography.tsx` (p=0.33), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.34)
- `collapse-branches-via-identity-element` → append to `groups/93.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.28), `packages/ui/react-ui/src/next/components/Icon/Icon.tsx` (p=0.25)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/132.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.45), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.20), `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx` (p=0.16), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.17)
- `structural-regions-use-design-system-components` → append to `groups/126.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx` (p=0.28), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.25)
- `prefer-branded-types-over-raw-primitives` → append to `groups/02.md`: `packages/ui/react-ui/src/next/components/Icon/Icon.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.24)
- `options-object-with-defaults` → append to `groups/17.md`: `packages/ui/react-ui/src/next/components/Input/Input.tsx` (p=0.33), `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.24)
- `event-handler-naming-convention` → append to `groups/34.md`: `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.30)
- `co-locate-tightly-coupled-code` → append to `groups/24.md`: `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx` (p=0.37)
- `import-as-namespace-is-all-or-nothing` → append to `groups/99.md`: `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx` (p=0.20)
- `inject-dependencies-via-constructor` → append to `groups/70.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.25)
- `namespace-brand-key-prefixing` → append to `groups/32.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.60), `packages/ui/react-ui/src/next/recipes.ts` (p=0.26), `packages/ui/react-ui/src/next/sizes.ts` (p=0.15)
- `no-casts` → append to `groups/109.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.15)
- `no-invented-theme-tokens` → append to `groups/122.md`: `packages/ui/react-ui/src/next/spike/Spike.stories.tsx` (p=0.17)
- `moon-yml-entrypoint-registration` → append to `groups/119.md`: `packages/ui/react-ui/package.json` (p=0.26)
- `diff-scoped-to-pr-purpose` → append to `groups/116.md`: `packages/ui/react-ui/src/next/DESIGN.md` (p=0.30)
