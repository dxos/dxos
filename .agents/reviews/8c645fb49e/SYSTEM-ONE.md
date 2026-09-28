# System One pass — .agents/reviews/8c645fb49e

- model: jev-latest
- base for context: `dd1e06bf0fe386df750c5d140a67fc9311420ce7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 19 violations written to fragments, 81 uncertain, 1068 clean, 0 unanswered

```text
requests: 451 (35 verdicts re-asked with context the model requested)
estimated input tokens: 2085900
billed input tokens: 1939425 (cost $0.0815)
measured chars per token: 3.23
```

## Still needs an agentic reviewer

Spawn one subagent per line below (37 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 53, 54, 55 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 72, 73, 74 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 76, 77, 78 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 80 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 82, 83, 84 as staged in STAGING.md
- `consistent-field-and-list-ordering` → append to `groups/13.md`: `packages/ui/react-ui/src/next/Next.tsx` (p=0.37), `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.tsx` (p=0.26), `packages/ui/react-ui/src/next/recipes.ts` (p=0.27)
- `no-invented-theme-tokens` → append to `groups/111.md`: `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx` (p=0.16)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/124.md`: `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx` (p=0.23), `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx` (p=0.23), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.23), `packages/ui/react-ui/src/next/components/Tag/Tag.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/Textarea/Textarea.stories.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx` (p=0.35)
- `no-pointless-indirection` → append to `groups/62.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.39), `packages/ui/react-ui/src/next/components/Tag/Tag.stories.tsx` (p=0.40)
- `no-impossible-state-handling` → append to `groups/65.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx` (p=0.40), `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx` (p=0.41), `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.40)
- `no-hand-rolled-lists` → append to `groups/113.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx` (p=0.16), `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx` (p=0.16), `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx` (p=0.19), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.16)
- `comment-hygiene` → append to `groups/07.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.49), `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.43), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.55)
- `event-handler-naming-convention` → append to `groups/32.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx` (p=0.26)
- `reuse-existing-mechanism` → append to `groups/50.md`: `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.46), `packages/ui/react-ui/src/next/components/Tag/Tag.tsx` (p=0.31), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.tsx` (p=0.56)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/120.md`: `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx` (p=0.77), `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx` (p=0.71), `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx` (p=0.78), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.72), `packages/ui/react-ui/src/next/components/Tag/Tag.stories.tsx` (p=0.75), `packages/ui/react-ui/src/next/components/Textarea/Textarea.stories.tsx` (p=0.77), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx` (p=0.38)
- `themed-primitives-take-classNames` → append to `groups/109.md`: `packages/ui/react-ui/src/next/components/DateInput/DateInput.tsx` (p=0.35), `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Tag/Tag.tsx` (p=0.39), `packages/ui/react-ui/src/next/components/Textarea/Textarea.tsx` (p=0.32)
- `name-for-general-behavior` → append to `groups/19.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.37), `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx` (p=0.38), `packages/ui/react-ui/src/next/testing.ts` (p=0.37)
- `no-trivial-wrappers-over-official-apis` → append to `groups/91.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.38), `packages/ui/react-ui/src/next/testing.ts` (p=0.29)
- `error-messages-carry-context` → append to `groups/75.md`: `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx` (p=0.31), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.40), `packages/ui/react-ui/src/next/testing.ts` (p=0.15)
- `jsdoc-non-obvious-identifiers` → append to `groups/11.md`: `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.32)
- `collapse-branches-via-identity-element` → append to `groups/89.md`: `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx` (p=0.37)
- `options-object-with-defaults` → append to `groups/17.md`: `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.36)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/121.md`: `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.15)
- `keep-parallel-apis-structurally-aligned` → append to `groups/36.md`: `packages/ui/react-ui/src/next/components/Popover/Popover.tsx` (p=0.26), `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.tsx` (p=0.45)
- `extract-non-rendering-logic-from-component` → append to `groups/119.md`: `packages/ui/react-ui/src/next/components/Select/Select.tsx` (p=0.18)
- `consistent-file-naming-within-folder` → append to `groups/27.md`: `packages/ui/react-ui/src/next/index.ts` (p=0.42), `packages/ui/react-ui/src/next/testing.ts` (p=0.40)
- `namespace-brand-key-prefixing` → append to `groups/31.md`: `packages/ui/react-ui/src/next/recipes.ts` (p=0.25), `packages/ui/react-ui/src/next/testing.ts` (p=0.27)
- `dont-leak-internal-api-through-public-surface` → append to `groups/06.md`: `packages/ui/react-ui/src/next/testing.ts` (p=0.38)
- `diff-scoped-to-pr-purpose` → append to `groups/105.md`: `packages/ui/react-ui/src/next/DESIGN.md` (p=0.43)
