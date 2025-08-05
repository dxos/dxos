//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { IconButton } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type TagPickerItemData } from './extension';
import { TagPicker } from './TagPicker';

const allItems: TagPickerItemData[] = [
  { id: 'cloudflare', label: 'Cloudflare', hue: 'amber' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'dxos', label: 'DXOS', hue: 'green' },
  { id: 'blue-yard', label: 'Blue Yard', hue: 'blue' },
  { id: 'effect', label: 'Effect' },
  { id: 'github', label: 'GitHub' },
  { id: 'socket-supply', label: 'Socket Supply', hue: 'indigo' },
];

const meta: Meta<typeof TagPicker> = {
  title: 'ui/react-ui-tag-picker/TagPicker',
  component: TagPicker,
  render: ({ items: initialItems, mode }) => {
    const [items, setItems] = useState(initialItems ?? []);
    const [selected, setSelected] = useState<string>();
    // TODO(burdon): Line height.
    // TODO(burdon): Wrap option.
    return (
      <div className='w-[20rem] space-y-2'>
        <div className='flex p-1 border items-center border-separator'>
          <TagPicker
            items={items}
            mode={mode}
            onSelect={(id) => setSelected(id)}
            onUpdate={(ids) => setItems(ids.map((id) => allItems.find(({ id: itemId }) => itemId === id)!))}
            onSearch={(text, ids) =>
              allItems.filter(
                ({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()),
              )
            }
          />
          <IconButton
            icon='ph--x--regular'
            label='Clear'
            iconOnly
            onClick={() => {
              setItems([]);
              setSelected(undefined);
            }}
          />
        </div>
        <div className='flex border p-1 border-separator'>
          <TagPicker readonly items={items} onSelect={(id) => setSelected(id)} />
        </div>
        <div className='flex flex-col h-[20rem] p-2 text-xs border border-separator'>
          <pre>{JSON.stringify({ items: items.map(({ id }) => id), selected }, null, 2)}</pre>
        </div>
      </div>
    );
  },
  decorators: [withTheme, withLayout()],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof TagPicker>;

export const MultiSelect: Story = {
  args: {
    items: [allItems[0], allItems[1]],
  },
};

export const SingleSelect: Story = {
  args: {
    mode: 'single-select',
    items: [allItems[0]],
  },
};
