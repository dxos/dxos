//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Board } from './Board';

const meta: Meta<typeof Board> = {
  title: 'ui/react-ui-board/Board',
  component: Board,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Board>;

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
