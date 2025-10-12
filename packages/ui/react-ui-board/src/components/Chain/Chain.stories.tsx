//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Chain, type ChainRootProps } from './Chain';

const DefaultStory = (props: ChainRootProps) => {
  return (
    <Chain.Root {...props}>
      <Chain.Background />
    </Chain.Root>
  );
};

const meta = {
  title: 'ui/react-ui-board/Chain',
  component: Chain.Root,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nodes: [
      { id: '1', type: 'custom', data: { label: 'Node 1' }, position: { x: 0, y: -128 } },
      { id: '2', type: 'custom', data: { label: 'Node 2' }, position: { x: 0, y: 0 } },
      { id: '3', type: 'custom', data: { label: 'Node 3' }, position: { x: 0, y: 128 } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
};
