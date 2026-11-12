//
// Copyright 2026 DXOS.org
//

//
// The space graph kind in the shared editor, given a node registry with the kind in it, which is what the host
// builds from the plugin's `NodeType` contributions: the tool sits in the Extensions group of the rail, and a graph's
// seed, spacing and hue are its Properties.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import {
  type RenderList2D,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  fromRenderLists2D,
  kindNodeDef,
} from '@dxos/react-ui-canvas';
import { FullEditor, SceneEditorStory } from '@dxos/react-ui-canvas-editor/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Node, type Scene } from '@dxos/scene';

import * as CanvasCapabilities from '../../types/CanvasCapabilities.ts';
import { spaceGraphSpec } from './SpaceGraph.tsx';

const NODES = createNodeRegistry(
  {
    ...defaultNodeTypes,
    'space-graph': kindNodeDef('space-graph', { group: CanvasCapabilities.EXTENSIONS_GROUP, ...spaceGraphSpec }),
  },
  defaultNodePrototypes,
);

const graph = (id: string, x: number, fields: Record<string, unknown>): Node => ({
  type: 'space-graph',
  id,
  z: `a${id}`,
  center: { x, y: 0 },
  size: { width: 384, height: 384 },
  ...fields,
});

/** Two spaces of different seeds, the second denser and in a hue of its own. */
const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [graph('one', -240, { seed: 7 }), graph('two', 240, { seed: 11, pitch: 20, hue: 'blue' })].map((node) => [
      node.id,
      node,
    ]),
  ),
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD], { root: 'board' });

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} nodes={NODES} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'plugins/plugin-canvas/components/SpaceGraph',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 1. Two space graphs are drawn, each a circle holding its objects.
 * 2. The Space graph tool is in the rail, in a group of its own: not among the shapes and links.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const graphs = await canvas.findAllByTestId('space-graph-node', undefined, { timeout: 30_000 });
    await expect(graphs.length).toBe(2);
    await expect(graphs[0].querySelectorAll('circle').length).toBeGreaterThan(20);

    const palette = await canvas.findByTestId('palette');
    // A group is a child of the rail; folded, it shows one of its tools and offers the rest from a flyout.
    const tool = palette.querySelector('[data-testid="canvas.tool.node:space-graph"]');
    const group = tool?.closest('[data-testid="palette"] > *');
    await expect(group).toBeTruthy();
    await expect(
      group?.querySelector('[data-testid="canvas.tool.node:rect"], [data-testid="canvas.tool.select"]'),
    ).toBeNull();
  },
};
