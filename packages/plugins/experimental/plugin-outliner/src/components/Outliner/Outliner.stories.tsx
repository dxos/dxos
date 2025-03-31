//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { create, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerController } from './Outliner';
import { createTree } from '../../testing';
import translations from '../../translations';
import { JournalType, TreeNodeType, TreeType } from '../../types';

const meta: Meta<typeof Outliner.Root> = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner.Root,
  render: ({ root: initialRoot }) => {
    const outliner = useRef<OutlinerController>(null);
    const [root, setRoot] = useState<TreeNodeType>();
    const space = useSpace();
    useEffect(() => {
      console.log('space', space);
      if (space && initialRoot) {
        setRoot(space.db.add(initialRoot));
      }
    }, [space, initialRoot]);

    return (
      <Outliner.Root
        ref={outliner}
        classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'
        root={root}
        onCreate={() => {
          return create(TreeNodeType, { children: [], text: '' });
        }}
      />
    );
  },
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [JournalType, TreeNodeType, TreeType] }),
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

const createText = () =>
  (faker.datatype.boolean({ probability: 0.3 }) ? `#${faker.helpers.arrayElement(tags)} ` : '') +
  faker.lorem.sentences(1);

export const Default: Story = {
  args: {
    root: createTree([10], createText),
  },
};

export const Large: Story = {
  args: {
    root: createTree([10, [0, 3], [0, 2]], createText),
  },
};
