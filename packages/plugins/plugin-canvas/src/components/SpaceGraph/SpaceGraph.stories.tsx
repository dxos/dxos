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
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  EXTENSIONS_GROUP,
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

import { spaceGraphSpec } from './SpaceGraph.tsx';

const NODES = createNodeRegistry(
  {
    ...defaultNodeTypes,
    'space-graph': kindNodeDef('space-graph', { group: EXTENSIONS_GROUP, ...spaceGraphSpec }),
  },
  defaultNodePrototypes,
);

/** A space graph as the engine draws one: the node base, and the kind's own fields under `data`. */
const graph = (id: string, x: number, data: Record<string, unknown>): Node & { data: Record<string, unknown> } => ({
  type: 'space-graph',
  id,
  z: `a${id}`,
  center: { x, y: 0 },
  size: { width: 384, height: 384 },
  data,
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
 * 3. Select a graph: Border reads on and Fill off. Turn Border off: the ring goes, nothing inside it moves, and the
 *    inspector stays in place.
 * 4. Its own fields are the last group, Custom, two to a row. Base dots is off: turn it on and the empty lattice
 *    points are drawn.
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

    // The ring is the frame's border, so Border is on, and turning it off takes the ring away without moving what
    // is inside it. The inspector stays where it is (the switch's hidden input once sat outside it, and focusing it
    // scrolled the whole panel away).
    await userEvent.click(graphs[0]);
    const dock = await canvas.findByTestId('scene-view-dock');
    const border = await within(dock).findByRole('switch', { name: 'Border' });
    // The kind's own fields are one group, labelled Custom, after every field the graph shares with the core's.
    const custom = await within(dock).findByTestId('group.data');
    await expect(custom.textContent).toMatch(/^Custom/);
    await expect(within(custom).getByText('Seed')).toBeTruthy();
    const style = within(dock).getByTestId('group.style');
    await expect(style.compareDocumentPosition(custom) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(
      0,
    );
    await expect(border).toBeChecked();
    // Selected, the ring keeps its own colour: the selection frame marks the graph.
    await expect(canvas.getAllByTestId('space-graph-node')[0].closest('[data-node-id]')?.className).not.toContain(
      'border-focus',
    );
    await expect(await within(dock).findByRole('switch', { name: 'Fill' })).not.toBeChecked();
    const placed = () => {
      const { x, y, width, height } = canvas.getAllByTestId('space-graph-node')[0].getBoundingClientRect();
      return [x, y, width, height];
    };
    const before = placed();
    await userEvent.click(border);
    await waitFor(() => expect(within(dock).getByRole('switch', { name: 'Border' })).not.toBeChecked());
    await expect(placed()).toEqual(before);
    await expect(
      Array.from(dock.querySelectorAll('*')).filter(
        (element) => element.scrollTop > 0 && getComputedStyle(element).overflowY === 'hidden',
      ),
    ).toEqual([]);

    // Two to a row: the density of the nodes beside the density of the links.
    const top = (name: string) => within(custom).getByText(name).getBoundingClientRect().top;
    await expect(top('Node density')).toBe(top('Link density'));
    // The lattice points that hold no object are drawn only once Base dots is on.
    const dots = () => canvas.getAllByTestId('space-graph-node')[0].querySelectorAll('circle[opacity]').length;
    await expect(dots()).toBe(0);
    await userEvent.click(within(custom).getByRole('switch', { name: 'Base dots' }));
    await waitFor(() => expect(dots()).toBeGreaterThan(0));
  },
};
