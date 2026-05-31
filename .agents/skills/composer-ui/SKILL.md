---
name: composer-ui
description: Use when building or styling plugin UI with Composer's design system — the
  `@dxos/react-ui*` packages. Covers theme tokens, primitives (Panel/Card/List/Input/Button/Icon),
  the standard article container + toolbar/menu wiring, forms, attention/density, translations, and
  storybook setup. The UI adjunct to the composer-plugins skill; consult it whenever you write a
  container/component, reach for a Tailwind color class, build a toolbar, or add a story.
---

# Composer UI

How to **consume** Composer's design system (`@dxos/react-ui*`) from a plugin. This is the UI adjunct
to [[composer-plugins]] (which owns plugin *structure*: capabilities, surfaces, schema, operations)
and [[composite-components]] (which owns *authoring* new `@dxos/react-ui` primitives). When you're
laying out a container, picking a color class, wiring a toolbar, or writing a story, the rules live here.

**Golden rule:** the design system already has a primitive, a token, or a layout for what you need.
Reaching for a raw `<div>` with custom classes, a native `<input>`, or a guessed color token is almost
always a sign you missed an existing piece. Find it (grep an existing themed component) before inventing.

## Package family

Import from the most specific package. Common ones:

| Package | Provides |
| --- | --- |
| `@dxos/react-ui` | Core primitives: `Panel`, `Card`, `List`, `Input`, `Button`, `IconButton`, `Icon`, `ScrollArea`, `Toolbar`, `Dialog`, `Popover`, `Tooltip`, `Select`, `Tag`, `Avatar`, `Separator`, plus `useTranslation`, `useThemeContext`, `DensityProvider`. |
| `@dxos/react-ui-theme` | The theme (`tx` resolver, tokens, Tailwind preset). You rarely import from it directly — tokens are plain Tailwind classes. |
| `@dxos/react-ui-form` | `Form.*` — schema-driven forms (the way to edit ECHO objects). |
| `@dxos/react-ui-menu` | `Menu.*`, `MenuBuilder`, `useMenuActions` — toolbars and command menus. |
| `@dxos/react-ui-attention` | Attention system: `AttentionGlyph`, `useAttention`, attendable wiring. |
| `@dxos/react-ui-list` | Navigable lists with `dx-current`/`dx-selected` item states. |
| `@dxos/react-ui-stack` / `-mosaic` / `-board` | Layout composition (Stack, Mosaic, Deck, Board) — usually owned by the shell, not plugins. |
| `@dxos/react-ui-editor` / `-markdown` | Text/markdown editing. |
| `@dxos/react-ui-table` / `-data` | Data tables. |

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
<Icon icon='ph--plus--regular' size={5} />
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

**`asChild` + composable.** Every `Panel.*` part is `slottable`, so `asChild` makes the part *become* its
single child instead of rendering its own `<div>`. Use `asChild` whenever the child is itself composable
(e.g. `ScrollArea.Root`): one fewer DOM node, and the height chain passes straight through. `ScrollArea`
provides the themed scrollbar **and** the height chain that lets content scroll — content that should
scroll goes in `ScrollArea.Viewport` inside `Panel.Content asChild`.

**Let components own their spacing.** `Form`, `List`, and `Stack` each control their own padding and
spacing — don't wrap them in a padded viewport or sprinkle `p-*`/`space-*` around them; that double-pads
and fights their internal rhythm. Reserve hand-written layout hints (`p-4 space-y-4`, `@container`
queries) on `ScrollArea.Viewport` for *ad-hoc* free-form content that has no owning component. Anything
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
    Atom.make((): ActionGraphProps =>
      MenuBuilder.make()
        .action('add', { label: ['add.label', { ns: meta.id }], icon: 'ph--plus--regular', disposition: 'toolbar' }, handleAdd)
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

## Forms & inputs

Never hand-roll native `<input>` / `<textarea>` / `<select>` in a plugin — they don't inherit the theme
(a bare textarea is a white box in dark mode) and bypass validation.

Edit ECHO objects with the schema-driven `Form`, which generates themed inputs from the Effect Schema
(strings, numbers, booleans, enums via `Schema.Literal`/`Format`, nested `Schema.Struct`, `Schema.Array`,
`Schema.Record`):

```tsx
<Form.Root schema={Type.getSchema(Foo)} values={obj} autoSave onSave={handleSave} />
```

- Hide non-editable fields with `FormInputAnnotation.set(false)`.
- For a bespoke field editor, register it via the Form's `fieldMap` / `fieldProvider` (see
  `plugin-kanban` `KanbanSettings`) — never a native element.
- To edit an opaque document (e.g. stored JSON Schema), model it with typed sub-schemas and render those
  as nested form fields rather than dropping to a `<textarea>`.

For simple one-off inputs that aren't backed by a schema object, use `Input.Root` + `Input.TextInput`.

## Cards: 3-slot subgrid

`Card.Header` and `Card.Row` are 3-slot subgrids (`grid-cols-subgrid`: leading icon · `1fr` content ·
trailing action), placed by child **order**. A lone `<Card.Title>` lands in the narrow leading slot and
gets clamped (a title renders as "20…"). Put real content in the centre slot — bracket it with icon slots
or wrap it in one element occupying slot 2:

```tsx
<Card.Header>
  <Card.IconBlock /> {/* slot 1 (icon) */}
  <div className='flex flex-col gap-0.5 min-w-0'> {/* slot 2 (1fr content) */}
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

Every new UI component gets a `.stories.tsx` beside it — the user reviews agent-built UI primarily through
storybook, so a missing story means the component effectively doesn't exist for review. Mount it with
realistic props and these decorators (import from `@dxos/react-ui/testing`):

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
export const Default: Story = { args: { /* realistic props */ } };
```

Two things break silently if omitted:

- **`withTheme()` must be CALLED with parens** — it's a factory returning the decorator. Passing
  `withTheme` (no parens) passes the factory itself and theme/types break.
- **`parameters: { translations }`** (from `#translations`) is required for `useTranslation` labels to
  resolve. Without it, triggers show the raw key (`foo.add.label`) instead of the translated text — which
  looks like a bug in a screenshot but isn't.

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

- Layout from `Panel.*` + `ScrollArea.*`; no wrapper `<div>`s for styling.
- Colors from verified tokens (grep `semantic.css` / copy a component); no invented tokens, no `className`.
- Toolbars via `MenuBuilder` + `useMenuActions` + `Menu.Root` with `attendableId`.
- Object editing via `Form.Root` + schema; no native inputs.
- Icons as `ph--<icon>--<weight>`.
- Every new component has a `.stories.tsx` with `withTheme()` (parens) + `parameters: { translations }`.
- Authoring a new `Foo.Root`/`Foo.Content` primitive → [[composite-components]]; plugin wiring → [[composer-plugins]].
