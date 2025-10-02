//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type QueryTag } from './query-editor-extension';
import { QueryEditor } from './QueryEditor';

const allTags: QueryTag[] = [
  { id: 'cloudflare', label: 'Cloudflare', hue: 'amber' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'dxos', label: 'DXOS', hue: 'green' },
  { id: 'blue-yard', label: 'Blue Yard', hue: 'blue' },
  { id: 'effect', label: 'Effect' },
  { id: 'github', label: 'GitHub' },
  { id: 'socket-supply', label: 'Socket Supply', hue: 'indigo' },
];

const meta = {
  title: 'ui/react-ui-query-editor/QueryEditor',
  component: QueryEditor,
  render: ({ items: initialItems }) => {
    const [items, setItems] = useState(initialItems ?? []);
    const [selected, setSelected] = useState<string>();
    // TODO(burdon): Line height.
    // TODO(burdon): Wrap option.
    return (
      <div className='w-[20rem] space-y-2'>
        <div className='flex p-1 border items-center border-separator'>
          <QueryEditor
            items={items}
            onSearch={(text, ids) =>
              allTags.filter(
                ({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()),
              )
            }
            onChange={(items) => console.log('[items]', items)}
          />
        </div>
        <div className='flex border p-1 border-separator'>
          <QueryEditor readonly items={items} />
        </div>
        <div className='flex flex-col h-[20rem] p-2 text-xs border border-separator'>
          <pre>{JSON.stringify({ items: items.map(({ id }) => id), selected }, null, 2)}</pre>
        </div>
      </div>
    );
  },
  decorators: [withTheme, withLayout()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof QueryEditor>;

export const MultiSelect: Story = {
  args: {
    items: [allTags[0], allTags[1]],
  },
};

export const SingleSelect: Story = {
  args: {
    items: [allTags[0]],
  },
};
