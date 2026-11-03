//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { type Arrangement, type GraphLayoutOptions, type GraphModel } from '@dxos/react-ui-canvas';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';
import { type Point } from '@dxos/scene';

import { Graph2DView } from './Graph2DView.tsx';

const ARRANGEMENTS: readonly Arrangement[] = ['crossings', 'rank', 'routed', 'force', 'force-free'];

const INITIAL: GraphModel = {
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

type StoryProps = { arrange: Arrangement };

/** The host's side: the graph and the placed positions live here, and links and deletes edit the graph. */
const DefaultStory = ({ arrange }: StoryProps) => {
  const [graph, setGraph] = useState(INITIAL);
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const layout = useMemo<GraphLayoutOptions>(
    () => ({
      lattice: { width: 192, height: 96, gutterX: 64, gutterY: 64 },
      arrange,
      link: { ends: { end: 'arrow' } },
    }),
    [arrange],
  );
  const handleLink = useCallback(
    (from: string, to: string) =>
      setGraph((current) => ({ ...current, edges: [...current.edges, { id: `${from}->${to}`, from, to }] })),
    [],
  );
  const handleDelete = useCallback(
    (ids: string[]) =>
      setGraph(({ nodes, edges }) => ({
        nodes: nodes.filter(({ id }) => !ids.includes(id)),
        edges: edges.filter(({ id, from, to }) => !ids.includes(id) && !ids.includes(from) && !ids.includes(to)),
      })),
    [],
  );
  return (
    <Graph2DView
      graph={graph}
      layout={layout}
      positions={positions}
      onPositionsChange={setPositions}
      onLink={handleLink}
      onDelete={handleDelete}
    />
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/views/Graph2DView',
  component: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
  argTypes: { arrange: { control: 'select', options: ARRANGEMENTS } },
  args: { arrange: 'crossings' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A dynamic layout on a lattice: shapes move and pin onto cells, links route through the gutters, and drawing a link or deleting edits the host's graph. */
export const Default: Story = {};
