# Form theming via tailwind-variants

Date: 2026-06-21
Status: Draft (awaiting review)

## Problem

`Form` (`@dxos/react-ui-form`) is a multi-part, schema-driven component, but unlike the react-ui
primitives it never adopted the `tx` theme mechanism. It hardcodes class strings inline, and the
recent attempt to make it configurable threaded className bags (`FieldPresentationConfig`,
`fieldClassName`/`labelClassName`/`controlClassName`) through `presentation.tsx` →
`FormFieldRendererProps` → every field, plus a `settingsLayout` preset object spread onto
`Form.Section`/`Form.FieldSet`. This is brittle: stringly-typed, no variant system, no per-part
typing, and the "settings panel" look is expressed as a bag of props rather than a named style.

We want a proper theming mechanism — prototyped on `Form`/settings — that we can later retrofit to
react-ui and other packages.

## Goals

- A component defines a **theme template**: typed parts (slots) × typed style axes (variants).
- The Settings look becomes a single named **variant** (`variant='settings'`), not a prop bag.
- Non-className state (e.g. `showDescription`) is handled in a typed, co-located way.
- Conflict resolution (tailwind-merge) is consistent with the existing `mx`, including dxos custom
  tokens (`text-base-fg`, density, focus-ring).
- A concrete, committed path to retrofit the existing `tx` registry — not hand-waved.

## Non-goals

- Migrating existing react-ui components (Message/Button/…) in this change. The retrofit is
  _designed_ here (the `bridgeTv` adapter + a Message migration sketch) but only `bridgeTv` + its
  unit test ship now.
- Changing the `FormPresentation` axis (`full`/`compact`/`inline`/`static`), which controls _which_
  parts render. That stays orthogonal to `variant` (which controls _how_ they look).

## Prior art

- **tailwind-variants (`tv`)** — first-class variant API with **slots** (multi-part components),
  typed `variants`, `compoundVariants`, `defaultVariants`, `extend` composition, per-slot `{ class }`
  overrides, and `VariantProps<typeof recipe>` for type extraction. `createTV({ twMerge, twMergeConfig })`
  builds an instance bound to a custom tailwind-merge config. This is the chosen mechanism.
- **Existing dxos `tx`** — `Theme<P>` is a tree of dot-addressable parts, each a
  `ComponentFunction<P>(styleProps, ...overrides) => string`; `bindTheme` resolves a dotted path via
  `getDeep` and ThemeProvider makes the whole tree swappable. tv is layered to coexist with this.
- **dxos translations** — nested-namespace dot-path resolution; the conceptual parallel for
  dot-addressable theme parts.

## Design

### 1. Shared `tv` instance (`@dxos/ui-theme`)

`mx` currently inlines its extended class groups in `packages/ui/ui-theme/src/util/mx.ts`. Extract
them into one shared `twMergeConfig` constant, then build both from it:

```ts
// packages/ui/ui-theme/src/util/tw-merge-config.ts
export const twMergeConfig = {
  extend: {
    classGroups: {
      'font-family': ['font-body', 'font-mono'],
      'font-weight': [
        /* …existing… */
      ],
      'density': ['dx-density-sm', 'dx-density-md', 'dx-density-lg'],
      'dx-focus-ring': [
        /* …existing… */
      ],
    },
  },
} as const;

// mx.ts
export const mx = extendTailwindMerge(twMergeConfig);

// tv.ts
import { createTV } from 'tailwind-variants';
export const tv = createTV({ twMerge: true, twMergeConfig });
```

This guarantees tv and `mx` resolve conflicts identically and can't drift. All component recipes
import this `tv`, never the bare library. Add `tailwind-variants` to the pnpm catalog and to
`@dxos/ui-theme` deps.

> Implementation note: confirm the exact `twMergeConfig` shape tv forwards to
> `extendTailwindMerge` (flat vs `extend`) and adjust the shared constant accordingly so a single
> object feeds both. Verified at build time with an equivalence check against `mx`.

### 2. Theme-template shape: recipe + behavior

A component's theme template is two co-located parts keyed by the **same** variant union:

```ts
type FormVariant = 'default' | 'settings';
type FormBehavior = { showDescription: boolean };

export const formTheme = {
  styles: tv({
    slots: {
      /* … */
    },
    variants: {
      variant: {
        default: {},
        settings: {
          /* … */
        },
      },
    },
    defaultVariants: { variant: 'default' },
  }),
  behavior: {
    default: { showDescription: false },
    settings: { showDescription: true },
  } satisfies Record<FormVariant, FormBehavior>,
};
```

`tv` owns className composition; the typed `behavior` record owns non-class flags. One `variant`
drives both. `bridgeTv` (§6) bridges only `.styles` into the `tx` tree — behavior is component-local
because themes _restyle_, they must not change logic.

### 3. `Form.theme.ts`

Slots map 1:1 to real DOM targets (no structural guesswork):

| slot                 | DOM target                                           |
| -------------------- | ---------------------------------------------------- |
| `section`            | `Form.Section` container                             |
| `sectionTitle`       | `Form.Section` `<h2>`                                |
| `sectionDescription` | `Form.Section` `<p>`                                 |
| `fieldSet`           | `Form.FieldSet` container (`FieldContainer` wrapper) |
| `field`              | `FormFieldWrapper` outer row                         |
| `labelContainer`     | `FormFieldLabel` outer grid div (column span)        |
| `labelText`          | `FormFieldLabel` inner label node (size/color)       |
| `description`        | `Input.Description`                                  |
| `control`            | wrapper around the field's control                   |

```ts
export const formTheme = {
  styles: tv({
    slots: {
      section: 'flex flex-col pt-form-section-gap first:pt-0',
      sectionTitle: 'text-lg',
      sectionDescription: 'text-description',
      fieldSet: '',
      field: '',
      labelContainer: '',
      labelText: '',
      description: 'text-description',
      control: '',
    },
    variants: {
      variant: {
        default: {},
        settings: {
          sectionTitle: 'px-trim-md text-xl',
          sectionDescription: 'px-trim-md',
          fieldSet: 'flex flex-col gap-trim-md pt-trim-md',
          field:
            'grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-trim-lg gap-y-0 p-trim-md border border-separator rounded-sm',
          labelContainer: 'md:col-span-full',
          labelText: 'pb-trim-md text-base-fg text-lg',
          description: 'text-base text-description',
          control: 'flex items-center justify-end py-1',
        },
      },
    },
    defaultVariants: { variant: 'default' },
  }),
  behavior: {
    default: { showDescription: false },
    settings: { showDescription: true },
  } satisfies Record<FormVariant, FormBehavior>,
};

export type FormVariant = VariantProps<typeof formTheme.styles>['variant'];
```

### 4. Component wiring

- `Form.Root` gains `variant?: FormVariant` (default `'default'`), stored in `FormContextValue`
  (which already spreads `FieldContext`).
- Each Form part reads `variant` from `useFormContext()`, computes `const s = formTheme.styles({ variant })`,
  and renders the relevant slot with the consumer's `classNames` merged via the per-slot override:
  `className={s.field({ class: classNames })}`.
- `FormFieldWrapper` reads `variant` from context (no more `fieldPresentation` prop threading);
  `showDescription = formTheme.behavior[variant].showDescription` decides whether to render
  `<Input.Description>{description}</Input.Description>` (description text still comes from the schema
  annotation via `FormField`). The control is wrapped in `s.control()` (empty/no wrapper in
  `default`). `FormFieldLabel` applies `s.labelContainer({ class: classNames })` to its **outer grid
  div** (carries `md:col-span-full` in settings) and `s.labelText()` to the **inner label node**,
  merged over `inputTextLabel` (carries `text-lg`/`text-base-fg` in settings). The split is required
  because the column span must sit on the grid item while the text size must sit on the inner node —
  `inputTextLabel` bakes `text-sm`/`text-description` onto the inner node, so a single class on the
  outer div cannot override the inner text. A single `label` slot is therefore insufficient.
- `variant` and `layout` (FormPresentation) are independent: `presentationFor(layout)` reverts to its
  original class-free shape (`{ layout, isStatic, showLabel, showError }`); the className fields and
  `showDescription` added in the previous round are removed from it.

### 5. Removals (the brittle layer)

- `FieldPresentationConfig` (types.ts), `fieldPresentation` on `FormFieldOptions`/`FormFieldRendererProps`.
- `presets.ts` (`FormLayout`, `settingsLayout`).
- `fieldClassName`/`labelClassName`/`controlClassName`/`descriptionClassName`/`showDescription` on
  `FieldPresentation` + the `FieldRow` seam in `presentation.tsx`; `FormFieldWrapper` applies
  `s.field(...)` directly.
- `Form.Section` keeps the `label`→`title` rename; its ad-hoc `titleClassName`/`descriptionClassName`
  props are removed (recipe slots replace them; per-call override remains via the slot's `{ class }`).
- `MarkdownSettings` becomes `<Form.Root variant='settings'>` with no preset spreads and no custom
  `fieldPresentation`; the debug-gated `filter` and the custom `SnippetsField` (rendered through
  `FormFieldWrapper`) are unchanged.

### 6. Retrofit bridge (designed; only adapter ships now)

Adapt a tv slots recipe into the existing `Theme<P>` shape (`{ slot: ComponentFunction }`) by
**explicit slot enumeration** (not a Proxy), so unknown paths resolve to `undefined` exactly as the
current `tx`/`getDeep` does, and the result is a plain, enumerable, devtools-inspectable object:

```ts
export const bridgeTv = <P extends Record<string, any>, S extends string>(
  recipe: (p: P) => Record<S, (o?: { class?: ClassNameValue }) => string>,
  slots: readonly S[],
): Theme<P> =>
  Object.fromEntries(
    slots.map((slot) => [
      slot,
      (styleProps: P, ...etc: ClassNameArray) => recipe(styleProps)[slot]({ class: etc }),
    ]),
  ) as Theme<P>;

// defaultTheme.ts
form: bridgeTv(formTheme.styles, Object.keys(formTheme.styles()) as FormSlot[]),
// → tx('form.field', { variant }, classNames) === formTheme.styles({ variant }).field({ class: classNames })
```

The slot list is derived once from `Object.keys(formTheme.styles())` so it can't drift from the
recipe. (Proxy alternative rejected: it returns a function for _any_ key, so a typo path defers its
failure to call time instead of resolving to `undefined` at lookup, and is opaque to `Object.keys`.)

This preserves ThemeProvider swap-ability and matches Message/Button consumption. **Retrofit plan**
(future change, documented, not implemented now): rewrite `Message.theme.ts` as a `tv` recipe +
`bridgeTv`, with a test asserting output equivalence to the current `messageTheme` across its
style props; then proceed component-by-component. The prototype ships `bridgeTv` + a unit test only.

### 7. Testing / verification

- Unit test: `bridgeTv` over a small recipe resolves `fn(styleProps, extra)` to the expected merged
  string for representative slots/variants/overrides.
- Build + lint `@dxos/ui-theme`, `@dxos/react-ui-form`, `plugin-markdown`; run `react-ui-form` tests.
- Visual: worktree storybook — `MarkdownSettings` (`variant='settings'`) and a `Form` story toggling
  `default` vs `settings`; confirm bordered 2-col cards, right-aligned controls, section padding,
  and that `default` forms are visually unchanged from today.
- Cast audit on the diff.

## Risks / open questions

- **tv `twMergeConfig` shape.** Must match what tv forwards to `extendTailwindMerge`; resolved during
  implementation with the equivalence check (§1).
- **`createTV` SSR/tree-shaking.** tailwind-variants is small and SSR-safe; recipes are module-level
  constants (evaluated once).
- **Context dependency in `FormFieldWrapper`.** Already depends on form context via `useFormFieldState`,
  so reading `variant` adds no new constraint.
- **Bundle/dep.** Adds `tailwind-variants` (depends on the already-present `tailwind-merge`).

## Dependencies

- Add `tailwind-variants` to the pnpm catalog and `@dxos/ui-theme`:
  `pnpm add --filter @dxos/ui-theme --save-catalog tailwind-variants`.
