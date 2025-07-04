//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import '../styles.css';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactFlow } from '@xyflow/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

// Examples:
// https://reactflow.dev/showcase
// https://www.simple-ai.dev/docs/react-flow/components/generate-text-node
// https://www.jsonsea.com

type GraphProps = {};

const Graph = (props: GraphProps) => {
  return (
    <div className='absolute inset-0'>
      <ReactFlow {...props} />
    </div>
  );
};

const meta: Meta<typeof Graph> = {
  title: 'ui/react-ui-canvas-editor/Graph',
  component: Graph,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Graph>;

export const Default: Story = {
  args: {
    nodes: [
      { id: '1', position: { x: 0, y: 100 }, data: { label: '1' } },
      { id: '2', position: { x: 0, y: 200 }, data: { label: '2' } },
      { id: '3', position: { x: 0, y: 300 }, data: { label: '3' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
};
