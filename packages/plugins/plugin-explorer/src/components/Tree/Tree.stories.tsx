//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { random } from '@dxos/random';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { createTree } from '../../testing';
import { type TreeComponentProps, Tree } from './Tree';
import { treeTypeToTreeNode } from './types';

random.seed(1);

type StoryArgs = Pick<TreeComponentProps, 'variant'>;

const DefaultStory = ({ variant }: StoryArgs) => {
  const data = useMemo(() => treeTypeToTreeNode(createTree([3, [2, 4], [1, 3]]).tree), []);
  if (!data) {
    return <Loading />;
  }

  return <Tree data={data} variant={variant} />;
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-explorer/components/Tree',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Tidy: Story = {
  args: {
    variant: 'tidy',
  },
};

export const Radial: Story = {
  args: {
    variant: 'radial',
  },
};

export const Edge: Story = {
  args: {
    variant: 'edge',
  },
};
