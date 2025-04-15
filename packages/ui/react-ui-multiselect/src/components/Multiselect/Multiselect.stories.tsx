//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { IconButton } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Multiselect } from './Multiselect';
import { type MultiselectItem } from './extension';

const allItems: MultiselectItem[] = [
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'dxos', label: 'DXOS' },
  { id: 'blue-yard', label: 'Blue Yard' },
  { id: 'effect', label: 'Effect' },
  { id: 'github', label: 'GitHub' },
  { id: 'socket-supply', label: 'Socket Supply' },
];

const meta: Meta<typeof Multiselect> = {
  title: 'ui/react-ui-multiselect/Multiselect',
  component: Multiselect,
  render: ({ items: initialItems }) => {
    const [items, setItems] = useState(initialItems);
    const [selected, setSelected] = useState<string>();
    // TODO(burdon): Line height.
    // TODO(burdon): Wrap option.
    return (
      <div className='flex flex-col w-[20rem] max-w-[20rem] gap-4'>
        <div className='flex border border-separator'>
          <Multiselect
            classNames='pis-0.5 pie-0.5'
            items={items}
            onSelect={(id) => {
              setSelected(id);
            }}
            onUpdate={(ids) => {
              setItems(ids.map((id) => allItems.find(({ id: itemId }) => itemId === id)!));
            }}
            onSearch={(text, ids) => {
              return allItems.filter(
                ({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()),
              );
            }}
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
        <div className='flex border border-separator'>
          <Multiselect
            classNames='pis-0.5 pie-0.5'
            readonly
            items={items}
            onSelect={(id) => {
              setSelected(id);
            }}
          />
        </div>
        <div className='flex flex-col h-[20rem] p-2 text-xs border border-separator'>
          <pre>{JSON.stringify({ items: items.map(({ id }) => id), selected }, null, 2)}</pre>
        </div>
      </div>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Multiselect>;

export const Default: Story = {
  args: {
    items: [allItems[0], allItems[1]],
  },
};
