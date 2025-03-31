//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useRef } from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerController } from './Outliner';
import { createTree } from '../../testing';
import translations from '../../translations';

const meta: Meta<typeof Outliner.Root> = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner.Root,
  render: ({ tree }) => {
    const outliner = useRef<OutlinerController>(null);

    return (
      <Outliner.Root
        ref={outliner}
        classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'
        tree={tree}
        onCreate={() => {
          return { id: ObjectId.random(), children: [], text: '' };
        }}
      />
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

const createText = () =>
  (faker.datatype.boolean({ probability: 0.3 }) ? `#${faker.helpers.arrayElement(tags)} ` : '') +
  faker.lorem.sentences(1);

export const Default: Story = {
  args: {
    tree: createTree([10], createText).tree,
  },
};

export const Large: Story = {
  args: {
    tree: createTree([10, [0, 3], [0, 2]], createText).tree,
  },
};
