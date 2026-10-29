//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { Semantic } from '#graph';
import { translations } from '#translations';
import { type CodeGraph } from '#types';

import { SAMPLE_FILES, SAMPLE_GRAPH } from '../../testing.ts';
import { CodeGraphDiagram } from '../CodeGraphDiagram/index.ts';
import { CodeGraphCanvas } from './CodeGraphCanvas.tsx';

type StoryArgs = {
  layout?: CodeGraph.Layout;
  graph?: { nodes: CodeGraph.Node[]; edges: CodeGraph.Edge[] };
};

/** The container's logic without ECHO: the illustrator's positions under the user's drags. */
const DefaultStory = ({ layout = 'illustrator', graph = SAMPLE_GRAPH }: StoryArgs) => {
  const semantic = useMemo(
    () => (layout === 'illustrator' || layout === 'diagram' ? Semantic.layout(graph) : undefined),
    [layout, graph],
  );
  const [dragged, setDragged] = useState<Record<string, Semantic.Point>>({});
  const [selected, setSelected] = useState<string>();
  if (layout === 'diagram') {
    return <CodeGraphDiagram objects={semantic?.objects ?? []} selected={selected} onSelect={setSelected} />;
  }
  return (
    <div className='dx-fill relative'>
      <CodeGraphCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        arrange={layout === 'force' ? 'force' : 'crossings'}
        positions={{ ...semantic?.positions, ...dragged }}
        onPositionsChange={setDragged}
        selected={selected}
        onOpen={setSelected}
      />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-code-graph/components/CodeGraphCanvas',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
};

export default meta;

/** Package dependencies placed by the illustrator's semantic engine, on the canvas. */
export const Illustrator: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('code-graph-node')).toHaveLength(SAMPLE_GRAPH.nodes.length), {
      timeout: 10_000,
    });
  },
};

/** The same graph, force-directed and snapped to slots. */
export const Force: StoryObj<typeof meta> = { args: { layout: 'force' } };

/** Rows by dependency rank, ordered for fewest crossings. */
export const Rank: StoryObj<typeof meta> = { args: { layout: 'rank' } };

/** The illustrator's own drawing: the same layout with routed arrows, read-only. */
export const Diagram: StoryObj<typeof meta> = { args: { layout: 'diagram' } };

/** Files of one package by import: one group, so no frames. */
export const Files: StoryObj<typeof meta> = { args: { graph: SAMPLE_FILES } };
