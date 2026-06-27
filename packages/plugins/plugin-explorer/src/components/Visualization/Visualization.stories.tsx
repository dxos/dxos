//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SpaceGraphModel, type SpaceGraphEdge, type SpaceGraphNode } from '@dxos/schema';
import '@dxos/react-ui-graph/styles/graph.css';

import { type VisualizationVariantId } from './variants';
import { Visualization } from './Visualization';

// Synthetic neighbourhood: inbound sources → focus (left), focus → near → far (right, outgoing).
const NODES: SpaceGraphNode[] = [
  { id: 'focus', type: 'object', data: { label: 'Focus' } },
  ...Array.from(
    { length: 3 },
    (_, index): SpaceGraphNode => ({
      id: `src-${index}`,
      type: 'object',
      data: { label: `Source ${index}` },
    }),
  ),
  ...Array.from(
    { length: 5 },
    (_, index): SpaceGraphNode => ({
      id: `near-${index}`,
      type: 'object',
      data: { label: `Near ${index}` },
    }),
  ),
  ...Array.from(
    { length: 8 },
    (_, index): SpaceGraphNode => ({
      id: `far-${index}`,
      type: 'object',
      data: { label: `Far ${index}` },
    }),
  ),
];

const EDGES: SpaceGraphEdge[] = [
  // Inbound: sources point at the focus (left side, terminal).
  ...Array.from(
    { length: 3 },
    (_, index): SpaceGraphEdge => ({
      id: `e-src-focus-${index}`,
      type: 'ref',
      source: `src-${index}`,
      target: 'focus',
      data: { force: true },
    }),
  ),
  // Outgoing: focus → near → far (right side, explored).
  ...Array.from(
    { length: 5 },
    (_, index): SpaceGraphEdge => ({
      id: `e-focus-near-${index}`,
      type: 'ref',
      source: 'focus',
      target: `near-${index}`,
      data: { force: true },
    }),
  ),
  ...Array.from(
    { length: 8 },
    (_, index): SpaceGraphEdge => ({
      id: `e-near-far-${index}`,
      type: 'ref',
      source: `near-${index % 5}`,
      target: `far-${index}`,
      data: { force: true },
    }),
  ),
];

type StoryArgs = { variant: VisualizationVariantId; focus?: string };

const DefaultStory = ({ variant, focus }: StoryArgs) => {
  const model = useMemo(() => new SpaceGraphModel(Registry.make(), { nodes: NODES, edges: EDGES }), []);
  return (
    <Visualization.Root classNames='bg-base-surface' model={model} variant={variant} focus={focus}>
      <Visualization.Graph debug={false} />
    </Visualization.Root>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-explorer/components/Visualization',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Force: Story = { args: { variant: 'force' } };

export const Neighborhood: Story = { args: { variant: 'neighborhood', focus: 'focus' } };
