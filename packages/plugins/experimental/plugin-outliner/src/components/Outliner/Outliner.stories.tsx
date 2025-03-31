//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useRef } from 'react';

import { faker } from '@dxos/random';
import { create, createObject } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { createTree } from '../../testing';
import translations from '../../translations';
import { TreeNodeType } from '../../types';
import { Outliner, type OutlinerController } from './Outliner';

const meta: Meta<typeof Outliner.Root> = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner.Root,
  render: ({ root }) => {
    const outliner = useRef<OutlinerController>(null);

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
    root: createObject(createTree([10], createText)),
  },
};

export const Large: Story = {
  args: {
    root: createObject(createTree([10, [0, 3], [0, 2]], createText)),
  },
};
