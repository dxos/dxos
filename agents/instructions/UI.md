## UI Instructions

Idiomatic patterns for UI development.

- **Prefer DXOS UI components over raw DOM**
  E.g., use `Panel.Root`, `Toolbar.Root`, `Input.TextInput`, etc. instead of `<input>`/`<div>`/hand-rolled chrome.
  Components include theme/density/accessibility by default.

- **Container composition**
  Use `composable()` for self-rendering containers.
  Use `dx-container` for expandable layouts.

- **Avoid redundant class names**
  E.g., don't add `font-medium`/`text-sm` to components that already style themselves.
  Use `ThemedClassName` instead of manual `className` props.
  Use `classNames` only for overrides.

- **Type safety**
  Use `PropsWithChildren<…>` for child-accepting props.

- **Radix composite components.**
  Compound APIs follow the Radix shape (`Root` + named subcomponents).
  Specifically:
  - `Root` is **headless** by default (renders no DOM, just a `Provider`), matching `Select.Root` / `Dialog.Root` / `Tabs.Root`.
    Unless there's a specific structural reason, layout is the caller's responsibility.
  - `Viewport` is the scroll surface; wraps `ScrollArea.Root` + `ScrollArea.Viewport` and forwards the routine knobs (`thin`, `padding`, `centered`) so callers don't need `asChild` for them.
  - Use `createContextScope` from `@radix-ui/react-context` (not plain `createContext`) so future composers can scope cleanly.

- **`@fluentui/react-tabster` is the only arrow-nav layer.**
  Use `useArrowNavigationGroup({ axis, memorizeCurrent })` for arrow keys and `useFocusableGroup` for groupings.
  Don't roll bespoke `onKeyDown` arrow handlers. If tabster appears not to fire,
  fix initialization (it auto-inits via `useTabster` on first hook call) rather than duplicating the logic.

- **Match the codebase's selection vocabulary.**
  Single-mode selection IS what some draft designs called "current";
  the codebase doesn't make a `current` ≠ `selection` distinction at the API level
  (see `useSelected(_, 'single')` from `@dxos/react-ui-attention`, used throughout plugins). Use `selectedId` / `onSelectChange` / `aria-selected` / `dx-selected` for picker-style lists.
  Reserve `aria-current` (and `dx-current`) for "you-are-here" navigation patterns specifically (navtree, breadcrumbs, current page in a paged document) — not for the selected option in a listbox.

- **`dx-*` ↔ ARIA pairing**
  `aria-selected` ↔ `dx-selected`, `aria-current` ↔ `dx-current`. `dx-active` is not a defined utility.
  Toggle-button semantics (`aria-pressed`) don't pair with the row-selection utilities.
  See `packages/ui/ui-theme/src/css/components/selected.md`.

- **Stories: factor variants into one configurable `DefaultStory`**,
  `render` defined once on `meta`.
  When a stories file has multiple variants of the same component (Default / Filtering / WithDisabled / Loading / etc.),
  define a single `DefaultStory({ ... }: StoryArgs = {})` that accepts the variant flags as props,
  hoist the `render` callback up to `meta` so it is declared once, and have each named story export only its `args`.
  Keeps the structural code in one place; per-variant divergence is obvious at the bottom; reading the diff after a UI change shows
  exactly one render path. Skip the pattern only when stories diverge _structurally_ (different layout wrapper, master/detail split, etc.)
  — those stories keep their own `render` override on the named export and live alongside the meta-level default.

  ```tsx
  const meta = {
    title: 'ui/<package>/<Component>',
    render: (args) => <DefaultStory {...args} />,
    decorators: [withTheme({})],
  } satisfies Meta<StoryArgs>;

  export default meta;

  type Story = StoryObj<StoryArgs>;

  export const Default: Story = {};

  export const Filtering: Story = {
    args: {
      controlled: true,
    },
  };

  export const WithDisabled: Story = {
    args: {
      disabledIndices: [2, 5],
    },
  };
  ```
