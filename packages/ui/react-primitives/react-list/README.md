# `@dxos/react-list` — elemental list primitive

ARIA-only foundation for DXOS list components. Renders semantically-correct
`<ol>` / `<ul>` markup; when `selectable` is set, becomes a
`role="listbox"` with `role="option"` children that carry `aria-selected`.

This package applies **no** styling, **no** keyboard navigation, and **no**
`dx-*` utility classes. Those live above:

```text
   ┌────────────────────────────────────────────────────────────┐
   │ @dxos/react-ui-mosaic   virtualization, DnD, cards/board   │
   ├────────────────────────────────────────────────────────────┤
   │ @dxos/react-ui-list     dx-* styling, keyboard nav,        │
   │                         RowList / CardList containers      │
   ├────────────────────────────────────────────────────────────┤
   │ @dxos/react-list        ARIA + structure only ← this pkg   │
   └────────────────────────────────────────────────────────────┘
```

Most app code should reach for `@dxos/react-ui-list`. Use this primitive
directly only when building a new selectable surface that needs full
control over styling and keyboard handling — e.g. a custom Combobox.

## Components

| Component                      | Renders                                              |
| ------------------------------ | ---------------------------------------------------- |
| `List`                         | `<ol>` / `<ul>`; optionally `role="listbox"`         |
| `ListItem`                     | `<li>`; optionally `role="option"` + `aria-selected` |
| `ListItemHeading`              | `<div>` with `id` linked via `aria-labelledby`       |
| `ListItemOpenTrigger`          | Radix `Collapsible.Trigger`                          |
| `ListItemCollapsibleContent`   | Radix `Collapsible.Content`                          |

`ListItem` accepts `selected`, `defaultSelected`, `open`, `defaultOpen`,
and `collapsible` props; selection / open state can be controlled or
uncontrolled (uses `useControllableState`).

## Quick start

### Static unordered list (no selection)

```tsx
import { List, ListItem, ListItemHeading } from '@dxos/react-list';

<List variant='unordered'>
  <ListItem>
    <ListItemHeading>Coffee</ListItemHeading>
  </ListItem>
  <ListItem>
    <ListItemHeading>Tea</ListItemHeading>
  </ListItem>
</List>;
```

### Single-select listbox

```tsx
import { useState } from 'react';
import { List, ListItem, ListItemHeading } from '@dxos/react-list';

const Picker = ({ items }: { items: { id: string; label: string }[] }) => {
  const [selected, setSelected] = useState<string | undefined>(items[0]?.id);
  return (
    <List variant='unordered' selectable aria-label='Items'>
      {items.map((item) => (
        <ListItem
          key={item.id}
          selected={item.id === selected}
          onClick={() => setSelected(item.id)}
          // Pair `aria-selected` (set by the primitive when `selectable`)
          // with `dx-selected` from `@dxos/ui-theme` to get the canonical
          // selected-row visual treatment. See
          // ui-theme/src/css/components/selected.md.
          className='dx-hover dx-selected'
        >
          <ListItemHeading>{item.label}</ListItemHeading>
        </ListItem>
      ))}
    </List>
  );
};
```

### Multi-select listbox

```tsx
<List variant='unordered' selectable multiSelectable aria-label='Tags'>
  …
</List>;
```

`multiSelectable` adds `aria-multiselectable="true"`; without it the
listbox is single-select (the default; `aria-multiselectable` is
intentionally omitted to keep assistive-tech announcements concise).

### Collapsible item

```tsx
import {
  List,
  ListItem,
  ListItemHeading,
  ListItemOpenTrigger,
  ListItemCollapsibleContent,
} from '@dxos/react-list';

<List variant='unordered'>
  <ListItem collapsible defaultOpen>
    <ListItemOpenTrigger asChild>
      <ListItemHeading>Section A</ListItemHeading>
    </ListItemOpenTrigger>
    <ListItemCollapsibleContent>
      …content…
    </ListItemCollapsibleContent>
  </ListItem>
</List>;
```

## What this primitive does NOT provide

- **Keyboard navigation** — wire your own (or use `@dxos/react-ui-list`'s
  `RowList`, which integrates `@fluentui/react-tabster`).
- **Styling** — pair with `dx-hover` / `dx-selected` / `dx-current` from
  `@dxos/ui-theme` per the grammar in
  `ui-theme/src/css/components/selected.md`.
- **Virtualization or drag-and-drop** — see `@dxos/react-ui-mosaic`.

## Related

- [`@dxos/react-ui-list`](../../react-ui-list) — the styled / opinionated layer.
- [`@dxos/react-ui-mosaic`](../../react-ui-mosaic) — virtualized / draggable.
- [`packages/ui/react-ui-list/AUDIT.md`](../../react-ui-list/AUDIT.md) —
  rationale for the layering.
