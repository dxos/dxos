---
name: composer-ui
description: Use when building or styling plugin UI with Composer's design system — the
  `@dxos/react-ui*` packages. Covers theme tokens, primitives (Panel/Card/List/Input/Button/Icon),
  the standard container layout (Panel + ScrollArea), lists/pickers/stacks, schema-driven forms,
  toolbar/menu wiring, reactivity (useObject), attention/density, translations, and storybook setup.
  The UI adjunct to the composer-plugins skill; consult it whenever you write a container/component,
  reach for a Tailwind color class, build a toolbar, render a form or list, or add a story.
---

# Composer UI

How to **consume** Composer's design system (`@dxos/react-ui*`) from a plugin. This is the UI adjunct
to [[composer-plugins]] (which owns plugin _structure_: capabilities, surfaces, schema, operations)
and [[composite-components]] (which owns _authoring_ new `@dxos/react-ui` primitives). When you're
laying out a container, picking a color class, wiring a toolbar, or writing a story, the rules live here.

**Golden rule:** the design system already has a primitive, a token, or a layout for what you need.
Reaching for a raw `<div>` with custom classes, a native `<input>`, or a guessed color token is almost
always a sign you missed an existing piece. Find it (grep an existing themed component) before inventing.

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
  `bg-attention-surface`, `bg-accent-surface` (+ `-hover`).
- **Text:** `text-base-foreground` (body), `text-description` (muted), `text-subdued` (dimmest),
  `text-placeholder`, `text-accent-text`.
- **Borders:** `border-separator`, `border-subdued-separator`, `border-primary-separator`,
  `border-active-separator`, `border-focus-ring`.

Themed primitives accept overrides via a `classNames` prop (string or array) — never `className`.
Pass functional layout hints (`p-4`, `space-y-4`, `flex`, `@container` queries) freely; pass color/size
through tokens. If you're writing more than a layout hint by hand, you're probably missing a primitive.

## Icons

Icons are Phosphor sprite references named `ph--<icon>--<weight>` (weights: `regular`, `bold`, `fill`,
`light`, `duotone`, `thin`). Use the `Icon` primitive or any primitive that takes an `icon` prop:

```tsx
import { Icon } from '@dxos/react-ui';
<Icon icon='ph--plus--regular' size={5} />;
```

`size` is a numeric `Size` (Tailwind scale), or inherit from the `--dx-icon-size` CSS var.
See [`packages/ui/react-ui/src/components/Icon/Icon.tsx`](../../../packages/ui/react-ui/src/components/Icon/Icon.tsx).

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

## Lists, pickers, and stacks

Pick the collection primitive by decision order — don't hand-roll a list of mapped `<div>`s:

1. **Need a picker / combobox** (choose from a set, typeahead)? **Check for an existing one first** —
   `Picker` / `Combobox` / `Listbox` in [`@dxos/react-ui-list`](../../../packages/ui/react-ui-list/src/components),
   or a domain widget like `SearchList` (`@dxos/react-ui-search`). Reuse before building.
2. **A simple flat or tree list**? Use `@dxos/react-ui-list` — `List`, `RowList`, `Tree`, `Accordion`.
3. **A reorderable / resizable / tiled collection of surfaces**? Use the **`Stack` from
   `@dxos/react-ui-mosaic`** (`MosaicStack` / `MosaicVirtualStack`, with `MosaicStackTileComponent`
   tiles).

**Do NOT use `@dxos/react-ui-stack` — it is deprecated.** (Some plugins still import it; don't copy them.)
The live Stack is the Mosaic one.

**`dx-current` / `dx-selected` are automatic.** `List` and `Stack` drive current-item and selection state
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
    Atom.make(
      (): ActionGraphProps =>
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

When an ECHO object is passed into a component as a prop and the component must re-render on changes to it,
wrap it with **`useObject`** and read from the returned snapshot. A surface receiving an ECHO subject (e.g.
via `AppSurface.ObjectArticleProps<T>`) MUST do this — without it, mutations to nested arrays/structs (e.g.
`Obj.update(obj, (m) => (m.images = [...]))`) don't trigger a re-render until you navigate away and back:
the prop reference stays stable, and the subscription lives inside `useObject`.

```tsx
const [gallery] = useObject(subject);
// reads (gallery.images) re-render reactively;
// writes still go through the original subject:
const handleDelete = (index: number) =>
  Obj.update(subject, (obj) => {
    const mutable = obj as Obj.Mutable<Gallery.Gallery>;
    mutable.images = (mutable.images ?? []).filter((_, idx) => idx !== index);
  });
```

The snapshot type is narrow — cast as needed (`obj as Obj.Mutable<T>` inside `Obj.update`, or `as T` to
read fields not surfaced on `Snapshot<T>`). For _collections_ of objects use the reactive `useQuery`
rather than holding a plain array. (Pure presentational components that just receive scalar props don't
need any of this — keep `useObject` at the container boundary where the ECHO object enters.)

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
  args: {
    /* realistic props */
  },
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

## Checklist

- Layout from `Panel.*` + `ScrollArea.*`; no wrapper `<div>`s for styling; `asChild` when the child is composable.
- Let `Form`/`List`/`Stack` own their padding/spacing — don't double-pad them.
- Collections: existing picker/combobox → `react-ui-list` list → Mosaic `Stack`. Never `@dxos/react-ui-stack` (deprecated).
- Colors from verified tokens (grep `semantic.css` / copy a component); no invented tokens, no `className`.
- Toolbars via `MenuBuilder` + `useMenuActions` + `Menu.Root` with `attendableId`.
- Object editing via composed `Form` (`Viewport`/`Content`/`FieldSet`) + schema; no native inputs; form never mutates `values`.
- ECHO object passed into a component → wrap with `useObject` at the container boundary.
- Icons as `ph--<icon>--<weight>`.
- Every major component/container has a basic `.stories.tsx` with `withTheme()` (parens) + `parameters: { translations }`; add a `play` function for complex data behaviour.
- Authoring a new `Foo.Root`/`Foo.Content` primitive → [[composite-components]]; plugin wiring/surfaces → [[composer-plugins]].
