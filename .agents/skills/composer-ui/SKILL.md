---
name: composer-ui
description: Use when building or styling plugin UI with Composer's design system — the
  `@dxos/react-ui*` packages. Covers theme tokens, primitives (Panel/Card/List/Input/Button/Icon),
  the standard container layout (Panel + ScrollArea), lists/pickers/stacks, schema-driven forms,
  toolbar/menu wiring, reactivity (useObject), attention/density, translations, storybook setup, and
  before/after screenshots. The UI adjunct to the composer-plugins skill; consult it whenever you write
  a container/component, reach for a Tailwind color class, build a toolbar, render a form or list, add a
  story, or open a PR that changes what the app renders.
---

# Composer UI

How to **consume** Composer's design system (`@dxos/react-ui*`) from a plugin. This is the UI adjunct
to [[composer-plugins]] (which owns plugin _structure_: capabilities, surfaces, schema, operations)
and [[composite-components]] (which owns _authoring_ new `@dxos/react-ui` primitives). When you're
laying out a container, picking a color class, wiring a toolbar, or writing a story, the rules live here.

**Golden rule:** If the design system already has a primitive, a token, or a layout for what you need you must use it.
Reaching for a raw `<div>` with custom classes, a native `<input>`, or a guessed color token is almost
always a sign you missed an existing piece. Find it (grep an existing themed component) before inventing.

Low-level components (plugin/_/src/components, react-ui-_). Must NOT depend on `@dxos/app-framework` or `@dxos/app-toolkit` capabilitiess.
Instead aspects that may be derived from capabilites must be passed as properties.
Each component lives in its own subdirectory with an `index.ts` barrel.
Use named exports; no default exports.

## Package family

Import from the most specific package. Common ones:

| Package                               | Provides                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@dxos/react-ui`                      | Core primitives: `Panel`, `Card`, `List`, `Input`, `Button`, `IconButton`, `Icon`, `ScrollArea`, `Toolbar`, `Dialog`, `Popover`, `Tooltip`, `Select`, `Tag`, `Avatar`, `Separator`, plus `useTranslation`, `useThemeContext`, `DensityProvider`. |
| `@dxos/react-ui-theme`                | The theme (`tx` resolver, tokens, Tailwind preset). You rarely import from it directly — tokens are plain Tailwind classes.                                                                                                                      |
| `@dxos/react-ui-form`                 | `Form.*` — schema-driven forms (the way to edit ECHO objects).                                                                                                                                                                                   |
| `@dxos/react-ui-menu`                 | `Menu.*`, `MenuBuilder`, `useMenuActions` — toolbars and command menus.                                                                                                                                                                          |
| `@dxos/react-ui-attention`            | Attention system: `AttentionGlyph`, `useAttention`, attendable wiring.                                                                                                                                                                           |
| `@dxos/react-ui-list`                 | Navigable lists with `dx-current`/`dx-selected` item states.                                                                                                                                                                                     |
| `@dxos/react-ui-mosaic` / `-board`    | Layout composition (Mosaic `Stack`, Deck, Board) — usually owned by the shell, not plugins. (`@dxos/react-ui-stack` is **deprecated** — use the Mosaic `Stack`.)                                                                                 |
| `@dxos/react-ui-editor` / `-markdown` | Text/markdown editing.                                                                                                                                                                                                                           |
| `@dxos/react-ui-table` / `-data`      | Data tables.                                                                                                                                                                                                                                     |

Many more exist (`-card`, `-chat`, `-thread`, `-pickers`, `-search`, `-syntax-highlighter`, …). When you
need a domain widget, check for a `react-ui-<domain>` package before building one.

## Theme tokens

Color/spacing tokens are **plain Tailwind classes** generated from CSS custom properties. The source of
truth is [`packages/ui/ui-theme/src/css/theme/semantic.css`](../../../packages/ui/ui-theme/src/css/theme/semantic.css)
and the per-component files under [`packages/ui/ui-theme/src/css/components/`](../../../packages/ui/ui-theme/src/css/components/).

**The rule:** every `--color-<name>` custom property yields the utilities `bg-<name>`, `text-<name>`,
`border-<name>`. So `--color-modal-surface` → `bg-modal-surface`. To find a valid token, grep
`semantic.css` for `--color-`, or copy classes from an existing themed component — **never guess a name**.
Invented tokens (`bg-input`, `text-primary`) aren't in the theme and render wrong (e.g. white-on-white
in dark mode), which is the kind of bug that's invisible until someone toggles the theme.

Verified common tokens (kebab-case is current; legacy camelCase like `bg-modalSurface` / `text-baseText`
is being phased out — prefer the kebab forms):

- **Surfaces:** `bg-base-surface`, `bg-card-surface`, `bg-modal-surface`, `bg-toolbar-surface`,
  `bg-sidebar-surface`, `bg-deck-surface`, `bg-group-surface`, `bg-input-surface`, `bg-hover-surface`,
  `bg-attention-surface`, `bg-accent-bg` (+ `-hover`).
- **Text:** `text-base-fg` (body), `text-description` (muted), `text-subdued` (dimmest),
  `text-placeholder`, `text-accent-text`.
- **Borders:** `border-separator`, `border-subdued-separator`, `border-primary-separator`,
  `border-active-separator`, `border-focus-ring`.

Themed primitives accept overrides via a `classNames` prop (string or array) — never `className`.
Pass functional layout hints (`p-4`, `space-y-4`, `@container` queries) freely; pass color/size
through tokens. Hand-written `flex`/`grid` class soup is the exception, not the hint — `Flex`/`Grid` cover
it (see below). If you're writing more than a layout hint by hand, you're probably missing a primitive.

## Sizing vs logical utilities (post-Tailwind-3)

**Sizing is physical.** Use `w-*` / `h-*` / `min-w-*` / `max-h-*` / `size-*` for width and height. The
custom `is-*` / `bs-*` (inline-size / block-size) utilities were **dropped** — Tailwind core never shipped
logical _size_ utilities and keeps width/height physical, so `is-full` / `bs-[20rem]` are dead classes.
Prefer `w-full` / `h-[20rem]`.

**Direction-sensitive spacing stays logical** — these Tailwind ships and they flip correctly under RTL, so
keep using them: `ps-*` / `pe-*` (padding), `ms-*` / `me-*` (margin), `start-*` / `end-*` (inset),
`border-s` / `border-e` (border side), `text-start` / `text-end` (alignment). Do **not** rewrite these to
physical (`pl-`, `ml-`, `left-`, `text-left`).

**The `tailwindcss-logical` dialect is gone.** Dropped in the Tailwind v4 migration (#10611), so every
class it provided now compiles to **nothing** — silently. These are the ones that keep coming back, with
what to write instead:

| Dead class              | Write                 |
| ----------------------- | --------------------- |
| `pis-*` / `pie-*`       | `ps-*` / `pe-*`       |
| `pbs-*` / `pbe-*`       | `pt-*` / `pb-*`       |
| `pli-*` / `plb-*`       | `px-*` / `py-*`       |
| `mis-*` / `mie-*`       | `ms-*` / `me-*`       |
| `mbs-*` / `mbe-*`       | `mt-*` / `mb-*`       |
| `mli-*` / `mlb-*`       | `mx-*` / `my-*`       |
| `is-*` / `bs-*`         | `w-*` / `h-*`         |
| `min-is-*` / `min-bs-*` | `min-w-*` / `min-h-*` |
| `max-is-*` / `max-bs-*` | `max-w-*` / `max-h-*` |

This is the highest-frequency regression in this codebase, and the most expensive kind: nothing errors,
nothing lints, the layout is merely wrong — and when the dead class was load-bearing (a `min-bs-*` floor
reserving height, a `min-is-0` letting a grid child shrink) the failure surfaces far from its cause.
**Grep your diff before committing:**

```bash
git diff | grep -nE '\b(p|m)(is|ie|bs|be|li|lb)-|\b(min-|max-)?(is|bs)-'
```

Note the near-misses that ARE real: `ps-*`/`pe-*` and `ms-*`/`me-*` (Tailwind's own logical spacing) and
`inset-*`/`start-*`/`end-*`. Only the `-is-`/`-bs-`/`-li-`/`-lb-` infixes above are dead.

Rule of thumb: **width/height → physical; margin/padding/inset/border-side/text-align → logical.**

## Icons

Icons are Phosphor sprite references named `ph--<icon>--<weight>` (weights: `regular`, `bold`, `fill`,
`light`, `duotone`, `thin`). Use the `Icon` primitive or any primitive that takes an `icon` prop:

```tsx
import { Icon } from '@dxos/react-ui';
<Icon icon='ph--plus--regular' size={5} />;
```

`size` is a numeric `Size` (Tailwind scale), or inherit from the `--dx-icon-size` CSS var.
See [`packages/ui/react-ui/src/components/Icon/Icon.tsx`](../../../packages/ui/react-ui/src/components/Icon/Icon.tsx).

Nothing needs registering to use a new Phosphor icon — name it and it resolves. `dx--*` brand glyphs are
`regular`-only. How resolution works (and why an icon might not appear) →
[`packages/ui/react-ui/docs/icons.md`](../../../packages/ui/react-ui/docs/icons.md).

## Containers: Panel + ScrollArea

`Panel.*` ([`packages/ui/react-ui/src/components/Panel/Panel.tsx`](../../../packages/ui/react-ui/src/components/Panel/Panel.tsx))
is the container shell — a CSS grid with rows `auto 1fr auto` mapped to the `toolbar` / `content` /
`statusbar` areas, so the content row absorbs the slack and the toolbar/statusbar hug their content. The
canonical article shape:

```tsx
<Panel.Root role={role}>
  <Panel.Toolbar>{/* Menu.Root toolbar — see below */}</Panel.Toolbar>
  <Panel.Content asChild>
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>{/* List / Stack / Form, or ad-hoc content */}</ScrollArea.Viewport>
    </ScrollArea.Root>
  </Panel.Content>
</Panel.Root>
```

Parts: `Panel.Root` / `Panel.Toolbar` / `Panel.Content` / `Panel.Statusbar`. Add `Panel.Statusbar` (takes a
`size`) only when the surface needs a persistent bottom status row — most articles don't.

**`role`:** `Panel.Root` defaults `role` to `none`. Only pass a `role` that the surface itself receives
(the article/section/companion role threaded in via `AppSurface.*Props`) — don't invent ARIA roles to
hang behaviour on.

**`asChild` + composable.** Every `Panel.*` part is `slottable`, so `asChild` makes the part _become_ its
single child instead of rendering its own `<div>`. Use `asChild` whenever the child is itself composable
(e.g. `ScrollArea.Root`): one fewer DOM node, and the height chain passes straight through. `ScrollArea`
provides the themed scrollbar **and** the height chain that lets content scroll — content that should
scroll goes in `ScrollArea.Viewport` inside `Panel.Content asChild`.

**Let components own their spacing.** `Form`, `List`, and `Stack` each control their own padding and
spacing — don't wrap them in a padded viewport or sprinkle `p-*`/`space-*` around them; that double-pads
and fights their internal rhythm. Reserve hand-written layout hints (`p-4 space-y-4`, `@container`
queries) on `ScrollArea.Viewport` for _ad-hoc_ free-form content that has no owning component. Anything
beyond a layout hint means you're probably missing a primitive — clear it with the user first.

**Never introduce a wrapper `<div>` for styling.** Wrappers break the height chain that `ScrollArea`
relies on (a wrapper around an input once silently disabled scrolling). If a context-provider component
(like `Input.Root`, which renders no DOM) has nowhere to hang a class, rely on parent-level layout rules
rather than wrapping — and if there's genuinely no path without a wrapper, discuss it first.

See: `plugin-chess/src/containers/ChessArticle/`, `plugin-sample/src/containers/`.

## Layout primitives: Flex, Grid, Column, Container

When you do need a box — inside `ScrollArea.Viewport`, between `Panel` parts, anywhere the shell doesn't
already give you one — reach for these before writing `<div className='flex …'>`. All take `asChild`, so
the layout can project onto a semantic element (`<header>`, `<ul>`) at no extra DOM node.
`Flex`/`Grid`/`Container` live in
[`packages/ui/react-ui/src/primitives/`](../../../packages/ui/react-ui/src/primitives) (not
`components/`); `Column` is in `components/Column`.

- **`Flex`** — `column`, `gap`, `align`, `justify`, `wrap`, `grow`, `center`. `grow` is
  `flex-1 overflow-hidden` (the height-chain link); `center` centers on both axes.
- **`Grid`** — `cols`, `rows`, `gap`, `align`, `center`, `grow`, `contents`. Tracks take a count for
  equal columns (`cols={3}`) or a list for anything asymmetric
  (`cols={['min-content', '1fr']}`, `cols={[2, 1]}` for `2fr 1fr`) — the list form replaces
  `grid-cols-[min-content_1fr]`, which is the least readable class in the corpus. `cols='subgrid'`
  adopts the parent's tracks and spans them. `overflow-hidden` comes only with `grow`, so a
  `grow={false}` grid clips no more than the `<div>` it replaced.
- **`Column`** — the gutter grid: three tracks (leading gutter / content / trailing gutter) sized by
  `--gutter`. This is what aligns icons, controls, and scrollbars to the same vertical rules across
  every surface, so use it instead of hand-padding a content column.
- **`Container`** — a bare `dx-expand` box, for when the only job is to fill the parent. Add
  `overflow-hidden` yourself if a clip is also wanted; it is no longer implied.

```tsx
<Flex column gap='sm'>…</Flex>
<Flex gap='sm' justify='end'>…</Flex>
<Flex center classNames='h-full text-subdued' role='status'>{t('empty.message')}</Flex>
<Flex asChild gap='sm'><header>…</header></Flex>
```

**`Column` parts.** `Column.Root` (`gutter: sm|md|lg`, `subgrid`, `gap`) defines the tracks and exposes
`--dx-col`; `Column.Center` puts plain content in the centre track and is the default choice;
`Column.Row` is a 3-track subgrid row for content flanked by gutter items; `Column.Block` is a gutter
slot sized to `--dx-rail-item` (`end` for the trailing gutter) so a passive `<Icon>` and an interactive
`IconButton` align to the pixel. For slotted children that can't take a part, the `withColumn` helpers
apply placement: `center()`, `placeContent()`, `propagate()`. Reach for `propagate()` — not `center()` —
when a descendant must address the gutters, e.g. a `ScrollArea` that should span full width and keep its
scrollbar out in the gutter; `Dialog.Body` depends on exactly that, and `center()` there confines the
body and pulls the scrollbar inboard. Nest with `subgrid` when a `Column` (or `Card`) sits inside another
3-track grid and must inherit its rules rather than invent new ones.

**`gap` takes ramp steps, not Tailwind numbers.** `xs | sm | md | lg | xl | 2xl | form | form-section`
([`primitives/layout.ts`](../../../packages/ui/react-ui/src/primitives/layout.ts)) — a `gap-2` literal is
precisely the drift the prop exists to prevent. `Flex` grows **no** padding or colour props on purpose
(components own their spacing); everything else goes through `classNames`. There is no implicit `align`:
row-centering is common, but defaulting it would silently restyle consumers relying on CSS `stretch`.

**This is a live migration, so match it rather than adding to the backlog.**
[`packages/ui/react-ui/AUDIT.md`](../../../packages/ui/react-ui/AUDIT.md) is the wrapper-div census that
produced `Flex` and drove the `Grid` extension: of 191 flex/grid wrappers in plugin containers, 145 are
converted. A new hand-rolled flex or grid div is new debt in a count someone is actively driving down.

## Lists, pickers, and stacks

**Rule: never hand-roll a list.** Any vertical collection of rows — even a
read-only display list — is built from a `@dxos/react-ui-list` primitive, never
a `map()` over `<div>`/`<li>`. A mapped stack of `<div>`s in a review is a
defect; reach for the primitive below instead. `@dxos/react-ui`'s core
`List`/`ListItem` are **deprecated** — do not use them; `Listbox` is their
successor.

Pick the collection primitive by decision order:

1. **Need a picker / combobox** (choose from a set, typeahead)? **Check for an existing one first** —
   `Picker` / `Combobox` / `Listbox` in [`@dxos/react-ui-list`](../../../packages/ui/react-ui-list/src/components),
   or a domain widget like `SearchList` (`@dxos/react-ui-search`). Reuse before building.
2. **A simple flat list** (display rows, selectable rows, or rows with per-row
   controls)? Use **`Listbox`** from `@dxos/react-ui-list`:
   `Listbox.Root` (headless; omit `value`/`onValueChange` for a non-selectable
   `role=list`, pass them for single-select) → `Listbox.Content` (the `<ul>`) →
   `Listbox.Item id=… classNames=…` (a row; put arbitrary children — labels via
   `Listbox.ItemLabel`, buttons, a `Select` — inside). See
   `plugin-space/src/components/ForeignKeys/ForeignKeys.tsx` for the read-only
   idiom. For a **reorderable / master-detail** list use `OrderedList`; for
   hierarchy use `Tree` / `Accordion`.
3. **A reorderable / resizable / tiled collection of surfaces**? Use the **`Stack` from
   `@dxos/react-ui-mosaic`** (`MosaicStack` / `MosaicVirtualStack`, with `MosaicStackTileComponent`
   tiles).

**Do NOT use `@dxos/react-ui-stack` — it is deprecated.** (Some plugins still import it; don't copy them.)
The live Stack is the Mosaic one.

**`dx-current` / `dx-selected` are automatic.** `Listbox` and `Stack` drive current-item and selection state
themselves (via react-tabster keyboard navigation) — you don't set those classes or wire focus by hand.
Like `Form`, both **own their own padding and spacing**, so drop them straight into a `ScrollArea.Viewport`
without a padded wrapper.

## Toolbar / menu wiring

Container toolbars are **always** built from menu actions, never bare `Toolbar.IconButton` chains.
Compose actions with `MenuBuilder` inside an `Atom`, thread them through `useMenuActions`, and render with
`Menu.Root` — passing `attendableId` so attention-driven contributions (graph actions, plugin extensions,
keyboard shortcuts) target the right surface. Skipping this breaks plugin composition.

```tsx
const actionsAtom = useMemo(
  () =>
    Atom.make((): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'add',
          { label: ['add.label', { ns: meta.id }], icon: 'ph--plus--regular', disposition: 'toolbar' },
          handleAdd,
        )
        .build(),
    ),
  [handleAdd],
);
const menuActions = useMenuActions(actionsAtom);

return (
  <Panel.Toolbar>
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Menu.Toolbar />
    </Menu.Root>
  </Panel.Toolbar>
);
```

Encode dynamic state (disabled, busy/idle icon swap) inside the action properties and list that state in
the `useMemo` deps — the atom rebuilds and the toolbar updates. Always thread `attendableId` from
`AppSurface.ObjectArticleProps`; don't underscore it as unused.

See: `plugin-sample/src/containers/SampleArticle.tsx`.

## Reactivity

State lives in one of three stores — React state (ephemeral, local), atoms (shared/derived), ECHO
objects (persistent, collaborative) — and reading an ECHO object during render does **not**
subscribe: subscribe where you read (`useObject` / `useQuery`), as narrowly as you read, and write
through the live object, never the snapshot. The house rules and anti-pattern catalog (bare reads,
`.target` in render, list-level ref resolution, hook pileups, effect-syncing between stores) live
in the [reactivity](../reactivity/SKILL.md) skill — load it for any component that holds or reads
state.

## State management

Two app-level homes for atom state — don't conflate them (full detail:
`packages/ui/react-ui-attention/AUDIT.md`):

- **Settings** — a user preference, _set infrequently_, applies globally, shown in the Settings UI.
  Built with `createKvsStore` (one schema-validated blob per plugin, keyed by `meta.profile.key`);
  read/write via `useAtomCapabilityState(XCapabilities.Settings)`. Idiom `org.dxos.effect.kvsStore`.
- **ViewState** — the _current, sticky UI state that survives navigation_ (selection, scroll, split,
  view mode). Per-context: keyed by `(aspect, contextId)`. Declare once with
  `define({ key, backend, schema, defaultValue })`; the `backend` sets durability —
  `'local'` persists across reloads (best-effort; degrades to memory when storage is blocked),
  `'memory'` is session-only. Read/write via `useViewState` / `useViewStateActions` (React), or
  `Capability.get(AttentionCapabilities.ViewState)` (operations / graph-builders). Idiom
  `org.dxos.react-ui-attention.viewState`.

The tell: _configure-once-and-forget_ → Settings; _tracks-what-you're-currently-doing_ → ViewState.
Keep at most **one Settings object and one ViewState object per aspect** per plugin — widen an
existing schema, don't add a parallel store.

Passing state into low-level components (which must not resolve capabilities): prefer a **writable
atom** over a `value` + `onChange` pair — simpler, and it needs no provider ancestor, so the component
stays generic. **Caveat:** a ViewState `local` atom does _not_ self-persist on a direct set —
persistence lives in `manager.set`. To hand ViewState down as one atom (e.g. combined with a settings
field), use a writable derived atom whose write calls `manager.set` (see `MessageArticle`'s
`optionsAtom`).

Consider factoring each state concern into a small **file-local hook** (e.g., `useMessageExpansion`,
`useThreadViewActions`) so the container body reads as a sequence
of named concerns instead of an inline wall.

## Forms

Never hand-roll native `<input>` / `<textarea>` / `<select>` in a plugin — they don't inherit the theme
(a bare textarea is a white box in dark mode) and bypass validation. Edit objects with the schema-driven
`Form` from `@dxos/react-ui-form`, which renders themed inputs from the Effect Schema (strings, numbers,
booleans, enums via `Schema.Literal`/`Format`, nested `Schema.Struct`, `Schema.Array`, `Schema.Record`).

**`Form` is composed — `Form.Root` renders nothing on its own.** The fields come from `Form.FieldSet` (or
`Form.Layout`), nested inside the standard Radix wrapper pair: `Form.Viewport` (outer) → `Form.Content`
(inner), which own scroll and padding (so, like List/Stack, don't pad them yourself):

```tsx
<Form.Root schema={Type.getSchema(Foo)} values={obj} autoSave onSave={handleSave}>
  <Form.Viewport>
    <Form.Content>
      <Form.Section label='…' description='…' /> {/* optional grouping */}
      <Form.FieldSet /> {/* fields, generated from the schema */}
      <Form.Actions /> {/* Save/Cancel — omit when autoSave */}
    </Form.Content>
  </Form.Viewport>
</Form.Root>
```

- **`Form.FieldSet`** is driven _entirely_ by the schema and its annotations — fields, order, labels,
  visibility. Hide a field with `FormInputAnnotation.set(false)`; there's no manual field markup.
- **`Form.Layout template={…}`** is the alternative to `FieldSet`: a custom layout DSL for arranging
  fields (grouping, columns, ordering) when the default schema order isn't enough.

**Save model — the form never mutates `values`; the parent applies the change.** Pick a mode:

- **`autoSave` + `onSave`** — on blur, if valid and changed, calls `onSave(values, { changed, isValid })`.
  This is the usual ECHO-object pattern: `onSave` writes back via `Obj.update`. No `Form.Actions` needed.
- **`onSave` without `autoSave`** — `onSave` fires only on explicit submit (`Form.Actions` / `Form.Submit`,
  gated by `canSave`). Use when you want a deliberate Save/Cancel.
- **`onValuesChanged`** — controlled: fires on every change with merged values + meta; the parent holds
  the state. Pair with `values`.

`values` is the controlled current value; `defaultValues` seeds an uncontrolled form that keeps its own
internal state. To edit an opaque document (e.g. a stored JSON Schema), model it with typed sub-schemas
and render those rather than dropping to a `<textarea>`. For a one-off input not backed by a schema
object, use `Input.Root` + `Input.TextInput`.

**Custom field renderers.** When a field needs an editor the schema can't express, supply a
`FormFieldComponent` (an `FC<FormFieldComponentProps>` — `label`, `readonly`, and value/onChange wiring) —
never a native element. Choose how to register it by _when you know which fields need it_:

- **`fieldMap: Record<jsonPath, FormFieldComponent>`** — static, when you know the property paths ahead of
  time. Override the renderer for specific named fields.
- **`fieldProvider: (props) => FormFieldComponent | undefined`** — dynamic, when you must decide at runtime
  (e.g. by type or annotation rather than exact path). Preferred for plugin-specific input surfaces.

See: [`packages/ui/react-ui-form/src/components/Form/Form.stories.tsx`](../../../packages/ui/react-ui-form/src/components/Form/Form.stories.tsx)
(a dedicated canonical custom-field example is planned — tracked separately).

## Cards: 3-slot subgrid

`Card.Header` and `Card.Row` are 3-slot subgrids (`grid-cols-subgrid`: leading icon · `1fr` content ·
trailing action), placed by child **order**. A lone `<Card.Title>` lands in the narrow leading slot and
gets clamped (a title renders as "20…"). Put real content in the centre slot — bracket it with icon slots
or wrap it in one element occupying slot 2:

```tsx
<Card.Header>
  <Card.IconBlock /> {/* slot 1 (icon) */}
  <div className='flex flex-col gap-0.5 min-w-0'>
    {' '}
    {/* slot 2 (1fr content) */}
    <Card.Title classNames='line-clamp-2'>{title}</Card.Title>
    {price && <span className='text-sm text-description'>{price}</span>}
  </div>
  <Card.IconBlock /> {/* slot 3 (action) */}
</Card.Header>
```

**Content parts must live inside a subgrid part, never directly under `Card.Root`.** `Card.Title`,
`Card.Text`, and `Card.Block` carry no column placement of their own — the center-track placement comes
from `Card.Header` / `Card.Row` / `Card.Section`. A `Card.Text` (or `Card.Title`) dropped straight into
`Card.Root` — or into `Card.Body`, which is `display:contents` and so doesn't place either — CSS-grid
auto-places into a **gutter** track and renders squeezed/clamped. Wrap free body text in a `Card.Row`:

```tsx
<Card.Root>
  <Card.Header>
    <Card.Title>…</Card.Title>
  </Card.Header>
  <Card.Row>
    <Card.Text variant='description'>…</Card.Text> {/* NOT a direct Card.Root/Card.Body child */}
  </Card.Row>
</Card.Root>
```

A card used as the child of `Focus.Item asChild` (or any Radix `Slot`/`asChild`) must be composable — a
single element that forwards `ref` and spreads injected props, or the Slot's `ref`/handlers silently drop
and current/keyboard/click wiring never attaches. Make presentational cards `forwardRef` and spread:

```tsx
export const FooCard = forwardRef<HTMLDivElement, FooCardProps>(({ subject, current, classNames, ...props }, ref) => (
  <Card.Root ref={ref} classNames={['dx-hover', current && 'dx-current', classNames]} {...props}>
    …
  </Card.Root>
));
```

For authoring brand-new composite primitives (Radix-style `Foo.Root`/`Foo.Content` with `slottable()` /
`composableProps`), see [[composite-components]].

## Attention & density

- **Attention** (`@dxos/react-ui-attention`): surfaces carry an `attendableId`; focusing one registers it
  so contributions target it and `AttentionGlyph` reflects focus. As a plugin author you mostly just
  thread `attendableId` into `Menu.Root` (above) and let the shell handle the rest.
- **Density** (`DensityProvider` / `useDensity`, values `xs|sm|md|lg`): scales spacing and hit-areas.
  Primitives read it automatically; wrap a region in `<DensityProvider density='…'>` only to override.

## Translations (i18n)

Use `useTranslation(meta.id)` for plugin-scoped strings and reference labels as `['key', { ns: meta.id }]`
(as in the menu action above). Resources are keyed by language → namespace → key, declared in the plugin's
`translations.ts` and contributed via `addTranslationsModule`. See [[composer-plugins]] for registration.

## Storybook

Every major component and container gets a `.stories.tsx` beside it — the user reviews agent-built UI
primarily through storybook, so a missing story means the component effectively doesn't exist for review.
**Start with a very basic story** for each (mount it with realistic props); add variants later. Mount it
with these decorators (import from `@dxos/react-ui/testing`):

```tsx
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '#translations';

const meta = {
  title: 'plugins/plugin-foo/FooView',
  component: FooView,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof FooView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  args: {/* realistic props */},
};
```

Two things break silently if omitted:

- **`withTheme()` must be CALLED with parens** — it's a factory returning the decorator. Passing
  `withTheme` (no parens) passes the factory itself and theme/types break.
- **`parameters: { translations }`** (from `#translations`) is required for `useTranslation` labels to
  resolve. Without it, triggers show the raw key (`foo.add.label`) instead of the translated text — which
  looks like a bug in a screenshot but isn't.

For a container with **complex data behavior** (loading, mutation, multi-step interaction), add a Storybook
`play` function that drives and asserts the interaction — a basic static story isn't enough to catch
regressions in behaviour. Keep the basic story too; `play` is the second step, not a replacement.

Capability hooks (`useCapability`, `useAppGraph`, `useOperationInvoker`) throw in storybook (no
PluginManager). Keep those in `containers/` and take resolved values as props in `components/` so the
component is storybook-mountable. See [[composer-plugins]] ("Container vs Component").

See: `plugin-sample/src/containers/SampleArticle.stories.tsx`,
`plugin-chess/src/components/Chessboard/Chessboard.stories.tsx`.

### Verifying a story in a worktree

`preview_start` serves storybook from the **main repo**, so it won't include stories that exist only in a
worktree. To verify worktree UI, run storybook from the worktree on a free port and drive it with
Playwright:

```bash
moon run storybook-react:serve -- --port 9014 --no-open --ci
```

Find story ids via `curl -s localhost:9014/index.json`, navigate to
`http://localhost:9014/iframe.html?id=<story-id>&viewMode=story`. Screenshots go to `temp/` (gitignored),
never the repo root. If a story renders empty with "Invalid hook call" / "Cannot read … 'useEffect'" /
504 "Outdated Optimize Dep", that's Vite dep-optimizer churn (dual React), not your code — kill storybook,
`rm -rf node_modules/.cache/storybook`, restart. Clean up the port and cache when done.

## Before/after screenshots

**A PR that changes rendered output ships before/after screenshots in its description.** A prop diff is
not reviewable as UI — nothing in `centered padding thin` tells a reviewer whether the active-tab
indicator now sits under the avatar. The pair is also the cheapest check on your own fix: measure the
element in both states and the numbers either move the way you predicted or they don't.

**Capture both states from one build.** Screenshot the fix, then restore the old value _in the live
page_ — set the property back on the element, toggle the class — and screenshot again. Rebuilding `main`
for the "before" swaps fonts, data, and window size along with it; reverting in the page leaves exactly
one variable.

**Measure, don't just look.** `getBoundingClientRect()` on the element and its neighbours plus the
`getComputedStyle` property you changed, in both states, printed in the PR beside the images.
`indicator 8.0..14.0, overlap=2px` is what makes the screenshot legible — and what catches a fix that
moved the wrong box.

Drive the surface from a story ("Verifying a story in a worktree" above), the local app, or the PR's own
`pr-<n>-composer-dev.dxos.workers.dev` preview once CI has deployed it:

```ts
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const clip = { x: 0, y: 0, width: 100, height: 260 };
const measure = () =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="…"]');
    return { box: el.getBoundingClientRect(), pad: getComputedStyle(el).paddingInline };
  });

console.log('after ', await measure());
await page.screenshot({ path: 'after.png', clip });
// Re-apply the pre-fix value on the running page.
await page.evaluate(() => {
  document.querySelector('[data-testid="…"]').style.paddingInline = 'var(--scroll-strip)';
});
console.log('before', await measure());
await page.screenshot({ path: 'before.png', clip });
```

`deviceScaleFactor: 2` and a tight `clip` are load-bearing — a full-page 1x shot of a 6px indicator shows
nothing. In the cloud sandbox add the chromium proxy args from [[cloud-sandbox]]; the default launch
cannot reach the preview host.

**Hosting.** Nothing uploads to GitHub's CDN over the API, so commit the PNGs to the branch, take
`https://raw.githubusercontent.com/dxos/dxos/<full-sha>/<path>` from that commit, then delete them in the
next commit — the URL is pinned to the SHA, so the images keep rendering while the PR's final diff carries
no binaries. Confirm with `curl -o /dev/null -w '%{http_code}'` once the deleting commit lands.

What holds the blob after the delete is `refs/pull/<n>/head`, which GitHub retains, so it also survives the
branch being deleted at merge. The URL is exactly that durable and no more: keep it to PR descriptions,
and use a committed path under `assets/` for anything that must outlive the PR (a README, docs). Never
link `.../<branch>/<path>` — that 404s the moment the file goes.

## Checklist

- Layout from `Panel.*` + `ScrollArea.*`; boxes inside them from `Flex`/`Grid`/`Column`/`Container`, never a
  hand-rolled `<div className='flex …'>`; `gap` from the ramp (`sm`/`md`/…), not `gap-2`; no wrapper
  `<div>`s for styling; `asChild` when the child is composable.
- Let `Form`/`List`/`Stack` own their padding/spacing — don't double-pad them.
- Collections: never hand-roll a list of mapped `<div>`s — existing picker/combobox → `react-ui-list` (`Listbox` for flat lists; `OrderedList`/`Tree`/`Accordion` otherwise) → Mosaic `Stack`. `@dxos/react-ui` `List`/`ListItem` and `@dxos/react-ui-stack` are deprecated.
- Colors from verified tokens (grep `semantic.css` / copy a component); no invented tokens, no `className`.
- Toolbars via `MenuBuilder` + `useMenuActions` + `Menu.Root` with `attendableId`.
- Object editing via composed `Form` (`Viewport`/`Content`/`FieldSet`) + schema; no native inputs; form never mutates `values`.
- ECHO object passed into a component → wrap with `useObject` at the container boundary.
- Icons as `ph--<icon>--<weight>`.
- Every major component/container has a basic `.stories.tsx` with `withTheme()` (parens) + `parameters: { translations }`; add a `play` function for complex data behaviour.
- Rendered output changed → before/after screenshots in the PR description, both from one build, with the measurements beside them.
- Authoring a new `Foo.Root`/`Foo.Content` primitive → [[composite-components]]; plugin wiring/surfaces → [[composer-plugins]].
