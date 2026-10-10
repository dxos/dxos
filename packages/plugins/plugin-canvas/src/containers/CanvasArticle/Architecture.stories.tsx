//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

import { architectureDiagrams, diagramFiles, edgeDiagrams } from '../../testing/architecture.ts';
import { type DiagramSet, loadDiagramSet } from '../../testing/diagrams.ts';

// The rendered diagrams, each carrying the DSL source it was laid out from (`docs/diagrams`, `render-diagrams`).
const files = import.meta.glob<string>('../../../docs/diagrams/*.dx.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

type StoryArgs = {
  /** The drawings open read-only: no tool, handle, port or panel edits them. */
  readonly: boolean;
};

// One drawing per diagram of the set; the overview opens as the article and its drill-down boxes open the others.
const withDiagrams = (set: DiagramSet) =>
  createStoryDecorators(({ args }) => ({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin()],
    onInit: async ({ space }) => {
      const root = await loadDiagramSet(space.db, set, { readonly: args.readonly === true });
      await space.db.flush();
      return [[Cell.article(root)]];
    },
  }));

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/containers/Architecture',
  render: () => <ModuleContainer />,
  args: { readonly: true },
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Opens once the overview's drill-down boxes are frames onto their diagrams. */
const play =
  (set: DiagramSet): Story['play'] =>
  async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 60_000 }),
    ).toBeInTheDocument();
    for (const box of Object.keys(set.drills[set.root])) {
      await waitFor(() => expect(canvasElement.querySelector(`[data-node-id="${box}/box"]`)).not.toBeNull(), {
        timeout: 10_000,
      });
    }
  };

const composer = architectureDiagrams(files);
const edge = edgeDiagrams(diagramFiles(files, 'edge'));

/** Composer: app layer, SDK and data, and EDGE; the framework, data, plugin, compute and EDGE boxes open a level each. */
export const Composer: Story = { decorators: withDiagrams(composer), play: play(composer) };

/** EDGE: clients, the gateway and the services; the router, db, compute and hub boxes open a level each. */
export const Edge: Story = { decorators: withDiagrams(edge), play: play(edge) };
