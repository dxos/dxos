//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { create, makeRef, RefArray } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Outliner } from './Outliner';
import translations from '../../translations';
import { TreeNodeType } from '../../types';

// TODO(burdon): Indent (Task graph).
// TODO(burdon): Create/delete.

// Data model:
// - Tree of nodes (base type for task list).
// - Journal.
// - Hierarchical document of tasks.
// - Master/detail (top-down vs. aligned vertically).

const meta: Meta<typeof Outliner.Root> = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner.Root,
  render: ({ node }) => {
    const [selected, setSelected] = useState<string | undefined>();

    return (
      <div className='flex h-full'>
        <Outliner.Root
          classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'
          node={node}
          selected={selected}
          onSelect={(id) => setSelected(id)}
          onCreate={(parent, previous, text) => {
            // setItems((items) => {
            //   const idx = items.findIndex((i) => i.id === preview.id);
            //   const item: TreeNodeType = { id: faker.string.uuid(), text: text ?? '' };
            //   items.splice(idx + 1, 0, item);
            //   setSelected(item.id);
            //   return [...items];
            // });
          }}
          onDelete={(parent, node) => {
            console.log('onDelete', parent, node);
            const nodes = RefArray.allResolvedTargets(parent.children ?? []);
            const idx = nodes.findIndex((n) => n.id === node.id);
            if (idx !== -1) {
              nodes.splice(idx, 1);
            }
          }}
        />
        <div className='flex flex-col w-[20rem] ml-2'>
          <div className='flex flex-col mt-2 border border-divider rounded'>
            <h1 className='p-2'>{faker.lorem.words(3)}</h1>
            <div className='p-2 text-sm'>{faker.lorem.paragraphs(3)}</div>
          </div>
          <div className='flex flex-col mt-24 border border-divider rounded'>
            <h1 className='p-2'>{faker.lorem.words(3)}</h1>
            <div className='p-2 text-sm'>{faker.lorem.paragraphs(1)}</div>
          </div>
        </div>
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

type Story = StoryObj<typeof Outliner.Root>;

export const Default: Story = {
  args: {
    node: create(TreeNodeType, {
      text: 'Root',
      children: faker.helpers.multiple(
        () =>
          makeRef(
            create(TreeNodeType, {
              text: faker.lorem.sentences(1),
              children: [],
            }),
          ),
        { count: 10 },
      ),
    }),
  },
};
