# System One pass — .agents/reviews/c68d22d914

- model: jev-latest
- base for context: `6d486787bbdfbb1ce1acfd6d3dd9adde23e6cddb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 73 uncertain, 769 clean, 0 unanswered

```text
requests: 344 (24 verdicts re-asked with context the model requested)
estimated input tokens: 1523431
billed input tokens: 1423790 (cost $0.0598)
measured chars per token: 3.21
```

## Still needs an agentic reviewer

Spawn one subagent per line below (31 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `delete-dead-code-after-migration` (system-one: off): review groups 36, 37 as staged in STAGING.md
- `fix-root-cause-not-symptom` (system-one: off): review groups 49, 50 as staged in STAGING.md
- `no-premature-abstraction` (system-one: off): review groups 52, 53 as staged in STAGING.md
- `avoid-full-collection-scans` (system-one: off): review groups 54 as staged in STAGING.md
- `refactor-must-preserve-behavior` (system-one: off): review groups 56, 57 as staged in STAGING.md
- `consistent-field-and-list-ordering` → append to `groups/10.md`: `packages/ui/react-ui/src/next/components/Image/Image.tsx` (p=0.35), `packages/ui/react-ui/src/next/Next.tsx` (p=0.32)
- `name-for-general-behavior` → append to `groups/14.md`: `packages/ui/react-ui/src/next/components/Image/Image.tsx` (p=0.37)
- `no-impossible-state-handling` → append to `groups/45.md`: `packages/ui/react-ui/src/next/components/Image/Image.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.48), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.36), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx` (p=0.23)
- `themed-primitives-take-classNames` → append to `groups/77.md`: `packages/ui/react-ui/src/next/components/Image/Image.tsx` (p=0.21), `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.21), `packages/ui/react-ui/src/next/components/Switch/Switch.tsx` (p=0.16), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.19), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.19), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.tsx` (p=0.16)
- `reuse-existing-mechanism` → append to `groups/35.md`: `packages/ui/react-ui/src/next/components/Image/Image.tsx` (p=0.44), `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.34), `packages/ui/react-ui/src/next/components/Switch/Switch.tsx` (p=0.32), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.58), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.tsx` (p=0.34)
- `no-trivial-wrappers-over-official-apis` → append to `groups/63.md`: `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx` (p=0.29), `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.30), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.28), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.33), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.28)
- `layout-only-wrapper-invisible-to-a11y` → append to `groups/90.md`: `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx` (p=0.28), `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.21), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx` (p=0.36), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx` (p=0.30), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.24), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx` (p=0.27), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.25), `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx` (p=0.30)
- `options-object-with-defaults` → append to `groups/12.md`: `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.31), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.37)
- `comment-hygiene` → append to `groups/06.md`: `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.37), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.41), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.58), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.42), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.tsx` (p=0.74), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.49), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.tsx` (p=0.56)
- `story-for-new-ui-component` → append to `groups/85.md`: `packages/ui/react-ui/src/next/components/Menu/Menu.tsx` (p=0.20), `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.tsx` (p=0.19), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.16), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.tsx` (p=0.15)
- `design-tokens-not-raw-spacing-sizing` → append to `groups/86.md`: `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.69), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.65), `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx` (p=0.79), `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx` (p=0.71)
- `no-hand-rolled-lists` → append to `groups/80.md`: `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.44)
- `structural-regions-use-design-system-components` → append to `groups/83.md`: `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx` (p=0.16), `packages/ui/react-ui/src/next/components/Field/Field.tsx` (p=0.16)
- `namespace-brand-key-prefixing` → append to `groups/21.md`: `packages/ui/react-ui/src/next/recipes.ts` (p=0.26)
- `error-messages-carry-context` → append to `groups/51.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.18), `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.21)
- `no-wrapper-div-around-asChild-single-child` → append to `groups/87.md`: `packages/ui/react-ui/src/next/components.stories.tsx` (p=0.15), `packages/ui/react-ui/src/next/components/Card/Card.tsx` (p=0.52)
- `no-invented-theme-tokens` → append to `groups/78.md`: `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx` (p=0.17)
- `barrel-imports-not-internal-paths` → append to `groups/26.md`: `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.tsx` (p=0.30)
- `no-pointless-indirection` → append to `groups/42.md`: `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx` (p=0.43)
- `keep-parallel-apis-structurally-aligned` → append to `groups/24.md`: `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.tsx` (p=0.28)
- `no-styling-wrapper-divs` → append to `groups/79.md`: `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx` (p=0.75)
- `diff-scoped-to-pr-purpose` → append to `groups/73.md`: `packages/ui/react-ui/src/next/DESIGN.md` (p=0.20)
