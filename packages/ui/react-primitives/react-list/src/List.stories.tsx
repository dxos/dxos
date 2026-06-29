//
// Copyright 2026 DXOS.org
//

// Stories for the elemental `@dxos/react-list` primitive — ARIA + structure
// only. These show the default-styling-free behavior of `List` / `ListItem`
// in isolation. For the styled, ARIA-correct, keyboard-navigable layer most
// app code reaches for, see `@dxos/react-ui-list`'s `Listbox` story.

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { List } from './List';
import { ListItem, ListItemCollapsibleContent, ListItemHeading, ListItemOpenTrigger } from './ListItem';

type Item = { id: string; label: string };

const items: Item[] = Array.from({ length: 5 }, (_, i) => ({
  id: `item-${i}`,
  label: `Item ${i + 1}`,
}));

//
// Static unordered list — no selection.
//

const StaticStory = () => (
  <List variant='unordered' className='dx-container border border-separator p-2'>
    {items.map((item) => (
      <ListItem key={item.id} className='py-1'>
        <ListItemHeading>{item.label}</ListItemHeading>
      </ListItem>
    ))}
  </List>
);

//
// Single-select listbox. Pairs `aria-selected` (set by the primitive when
// `selectable={true}`) with the canonical `dx-selected` / `dx-hover`
// utilities to demonstrate the ARIA ↔ dx-* grammar in its rawest form.
//

const SingleSelectStory = () => {
  const [selected, setSelected] = useState<string>(items[0].id);
  return (
    <List
      variant='unordered'
      selectable
      aria-label='Single-select example'
      className='dx-container border border-separator'
    >
      {items.map((item) => (
        <ListItem
          key={item.id}
          selected={item.id === selected}
          onClick={() => setSelected(item.id)}
          className='dx-hover dx-selected px-3 py-2 cursor-pointer outline-none'
        >
          <ListItemHeading>{item.label}</ListItemHeading>
        </ListItem>
      ))}
    </List>
  );
};

//
// Multi-select listbox. `multiSelectable` adds `aria-multiselectable="true"`
// on the listbox itself; selection state is per-item.
//

const MultiSelectStory = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([items[1].id]));
  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  return (
    <List
      variant='unordered'
      selectable
      multiSelectable
      aria-label='Multi-select example'
      className='dx-container border border-separator'
    >
      {items.map((item) => (
        <ListItem
          key={item.id}
          selected={selectedIds.has(item.id)}
          onClick={() => toggle(item.id)}
          className='dx-hover dx-selected px-3 py-2 cursor-pointer outline-none'
        >
          <ListItemHeading>{item.label}</ListItemHeading>
        </ListItem>
      ))}
    </List>
  );
};

//
// Collapsible item — opens / closes a Radix `Collapsible`-backed body.
// Useful for accordion-style headings without reaching for the full
// `react-ui-list` `Accordion` component.
//

const CollapsibleStory = () => (
  <List variant='unordered' className='dx-container border border-separator divide-y divide-separator'>
    {items.slice(0, 3).map((item) => (
      <ListItem key={item.id} collapsible defaultOpen={item.id === items[0].id}>
        <ListItemOpenTrigger asChild>
          <ListItemHeading className='cursor-pointer px-3 py-2 select-none'>{item.label}</ListItemHeading>
        </ListItemOpenTrigger>
        <ListItemCollapsibleContent>
          <div className='px-3 pb-2 text-description text-sm'>Details for {item.label}.</div>
        </ListItemCollapsibleContent>
      </ListItem>
    ))}
  </List>
);

// Inline column decorator — `react-list` deliberately doesn't depend on
// `@dxos/react-ui` (a `withTheme/withLayout` import would create a cycle
// since `react-ui` already depends on this primitive). Storybook's global
// `withThemeByClassName` already applies the theme class at the root.
const withColumn: Decorator = (Story) => (
  <div className='flex flex-col gap-4 p-4 h-full max-w-md'>
    <Story />
  </div>
);

const meta = {
  title: 'ui/react-list/List',
  decorators: [withColumn],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Static: Story = { render: StaticStory };
export const SingleSelect: Story = { render: SingleSelectStory };
export const MultiSelect: Story = { render: MultiSelectStory };
export const Collapsible: Story = { render: CollapsibleStory };
