//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { type GraphModel } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { LatticeGraph } from './LatticeGraph.tsx';

const GRAPH: GraphModel = {
  nodes: ['app', 'ui', 'model', 'store', 'sync', 'crypto'].map((id) => ({ id, label: id })),
  edges: [
    ['app', 'ui'],
    ['app', 'model'],
    ['ui', 'model'],
    ['model', 'store'],
    ['model', 'sync'],
    ['sync', 'crypto'],
    ['store', 'crypto'],
  ].map(([from, to]) => ({ id: `${from}->${to}`, from, to })),
};

const renderNode = (id: string) => (
  <Card.Root data-testid='lattice-graph.node'>
    <Card.Header>
      <Card.Title>{id}</Card.Title>
    </Card.Header>
  </Card.Root>
);

const meta = {
  title: 'plugins/plugin-code/components/LatticeGraph',
  component: LatticeGraph,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { graph: GRAPH, renderNode, lattice: { width: 192, height: 96, gutterX: 64, gutterY: 64 } },
} satisfies Meta<typeof LatticeGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A small layered graph: one card per cell, ranked along its edges, arrows routed through the gutters. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('lattice-graph.node')).toHaveLength(GRAPH.nodes.length), {
      timeout: 10_000,
    });
  },
};

/** The same graph with the force arrangement, which pulls linked cards together. */
export const Force: Story = {
  args: { arrange: 'force' },
};
