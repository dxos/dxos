# System One pass — .agents/reviews/9ad97b115e

- model: jev-latest
- base for context: `8c645fb49e11d62b7edc27860310b65c28d861c7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 74 uncertain, 1271 clean, 0 unanswered

```text
requests: 500 (37 verdicts re-asked with context the model requested)
estimated input tokens: 2643508
billed input tokens: 2458311 (cost $0.1032)
measured chars per token: 3.23
```

## Still needs an agentic reviewer

Spawn one subagent per line below (37 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 53, 54, 55 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 72, 73, 74 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 77, 78, 79 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 82 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 84, 85, 86 as staged in STAGING.md
- `no-impossible-state-handling` → append to `groups/65.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Checkbox/Checkbox.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx` (p=0.37), `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.30), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.32), `packages/ui/react-ui/src/next/testing.ts` (p=0.38)
- `error-messages-carry-context` → append to `groups/75.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.20), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx` (p=0.63)
- `comment-hygiene` → append to `groups/07.md`: `packages/ui/react-ui/src/next/Form.stories.tsx` (p=0.33), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.40), `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.40), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.53), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.34), `packages/ui/react-ui/src/next/recipes.ts` (p=0.48)
- `consistent-field-and-list-ordering` → append to `groups/13.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.28), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.33), `packages/ui/react-ui/src/next/recipes.ts` (p=0.26)
- `consistent-file-naming-within-folder` → append to `groups/25.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.36), `packages/ui/react-ui/src/next/testing.ts` (p=0.48)
- `reuse-existing-mechanism` → append to `groups/50.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.22), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.24)
- `no-pointless-indirection` → append to `groups/62.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.68)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/128.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx` (p=0.30)
- `no-hand-rolled-lists` → append to `groups/115.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.42)
- `options-object-with-defaults` → append to `groups/16.md`: `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.52), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.30), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.30)
- `themed-primitives-take-classNames` → append to `groups/108.md`: `packages/ui/react-ui/src/next/components/Button/Button.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Typography/Typography.stories.tsx` (p=0.56)
- `event-handler-naming-convention` → append to `groups/32.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.33), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx` (p=0.30), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.28)
- `extract-non-rendering-logic-from-component` → append to `groups/125.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.53)
- `dont-leak-internal-api-through-public-surface` → append to `groups/04.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.23), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.29), `packages/ui/react-ui/src/next/testing.ts` (p=0.33)
- `no-trivial-wrappers-over-official-apis` → append to `groups/93.md`: `packages/ui/react-ui/src/next/components/Container/Container.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx` (p=0.35), `packages/ui/react-ui/src/next/testing.ts` (p=0.36)
- `jsdoc-non-obvious-identifiers` → append to `groups/11.md`: `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.55)
- `collapse-branches-via-identity-element` → append to `groups/91.md`: `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.27), `packages/ui/react-ui/src/next/testing.ts` (p=0.20)
- `name-for-general-behavior` → append to `groups/20.md`: `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx` (p=0.41), `packages/ui/react-ui/src/next/testing.ts` (p=0.42)
- `inject-dependencies-via-constructor` → append to `groups/68.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.28)
- `namespace-brand-key-prefixing` → append to `groups/31.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.55), `packages/ui/react-ui/src/next/recipes.ts` (p=0.35), `packages/ui/react-ui/src/next/testing.ts` (p=0.18)
- `no-casts` → append to `groups/103.md`: `packages/ui/react-ui/src/next/components/Toolbar/toolbar-machine.ts` (p=0.15)
- `use-context-scoped-cancellation` → append to `groups/81.md`: `packages/ui/react-ui/src/next/testing.ts` (p=0.58)
- `lifecycle-owned-by-its-resource` → append to `groups/76.md`: `packages/ui/react-ui/src/next/testing.ts` (p=0.22)
- `diff-scoped-to-pr-purpose` → append to `groups/105.md`: `packages/ui/react-ui/src/next/DESIGN.md` (p=0.34)
