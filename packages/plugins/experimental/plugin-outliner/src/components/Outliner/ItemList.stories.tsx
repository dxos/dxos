//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Item } from './ItemList';
import translations from '../../translations';
import { type TreeItemType } from '../../types';

// TODO(burdon): Indent (Task graph).
// TODO(burdon): Create/delete.

const meta: Meta<typeof Item.List> = {
  title: 'plugins/plugin-outliner/ItemList',
  render: () => {
    const [items, setItems] = useState<TreeItemType[]>(
      Array.from({ length: 50 }, () => ({
        id: faker.string.uuid(),
        text: faker.lorem.sentences(1),
      })),
    );
    const [selected, setSelected] = useState<string | undefined>(items[0]?.id);

    return (
      <div className='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'>
        <Item.List
          items={items}
          selected={selected}
          onSelect={(id) => setSelected(id)}
          onCreate={(preview, text) => {
            setItems((items) => {
              const idx = items.findIndex((i) => i.id === preview.id);
              const item: TreeItemType = { id: faker.string.uuid(), text: text ?? '' };
              items.splice(idx + 1, 0, item);
              setSelected(item.id);
              return [...items];
            });
          }}
          onDelete={(item) => {
            setItems((items) => items.filter((i) => i.id !== item.id));
          }}
        />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center bg-baseSurface' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Item.List>;

export const Default: Story = {};
