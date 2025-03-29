//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useRef } from 'react';

import { faker } from '@dxos/random';
import { create, makeRef } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerController } from './Outliner';
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
  render: ({ root: node }) => {
    const outliner = useRef<OutlinerController>(null);

    return (
      <div className='flex h-full'>
        <Outliner.Root
          ref={outliner}
          classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'
          root={node}
          onCreate={() => {
            return create(TreeNodeType, { children: [], text: '' });
          }}
        />
        {/*
        <div className='flex flex-col w-[20rem] ml-2'>
          <div className='flex flex-col mt-2 border border-divider rounded'>
            <h1 className='p-2'>{faker.lorem.words(3)}</h1>
            <div className='p-2 text-sm'>{faker.lorem.paragraphs(2)}</div>
          </div>
          <div className='flex flex-col mt-16 border border-divider rounded'>
            <h1 className='p-2'>{faker.lorem.words(3)}</h1>
            <div className='p-2 text-sm'>{faker.lorem.paragraphs(1)}</div>
          </div>
        </div>
        */}
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

const tags = ['idea', 'bug', 'task', 'question', 'design', 'review', 'test', 'research', 'urgent', 'blocked'];

export const Default: Story = {
  args: {
    root: create(TreeNodeType, {
      text: 'Root',
      children: faker.helpers.multiple(
        () =>
          makeRef(
            create(TreeNodeType, {
              text:
                (faker.datatype.boolean({ probability: 0.3 }) ? `#${faker.helpers.arrayElement(tags)} ` : '') +
                faker.lorem.sentences(1),
              children: [],
            }),
          ),
        { count: 10 },
      ),
    }),
  },
};
