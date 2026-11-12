//
// Copyright 2026 DXOS.org
//

//
// The whole deck at once: every slide the spike has imported, one canvas each, laid out in a square. This is where
// the slides are compared — they are drawn at one scale (a slide unit is a scene px) on one grid, so a card on one
// slide is the size of a card on another and the nine read as one deck rather than nine drawings.
//
// Each canvas is a drawing of its own in one space, as the deck's slides are separate documents.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Cell, ModuleContainer, type ModuleSpec, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

import types from '../../capabilities/schema.ts';
import { addTestCanvas } from '../../testing/canvas.ts';
import { cardSpec } from '../../testing/studio/Card.tsx';
import { feedCardSpec } from '../../testing/studio/FeedCard.tsx';
import { STUDIO_SLIDES } from '../../testing/studio/slides.ts';
import { spaceGraphSpec } from '../../testing/studio/SpaceGraph.tsx';
import { STUDIO_CANVAS, seedStudioSlide } from '../../testing/studio/studio.ts';

/** Every kind the deck's slides use, contributed once for all of them. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioDeck'), name: 'Studio Deck Kinds' }),
).pipe(
  Plugin.addModule({
    id: 'studio-node-types',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed([
        Capability.contribute(CanvasCapabilities.NodeType, { type: 'card', spec: cardSpec }),
        Capability.contribute(CanvasCapabilities.NodeType, { type: 'feed-card', spec: feedCardSpec }),
        Capability.contribute(CanvasCapabilities.NodeType, { type: 'space-graph', spec: spaceGraphSpec }),
      ]),
  }),
  Plugin.make,
);

/** The cells as a square, filled column by column, so the deck reads as a grid rather than one long row. */
const square = (cells: ModuleSpec[]): ModuleSpec[][] => {
  const columns = Math.max(1, Math.ceil(Math.sqrt(cells.length)));
  const rows = Math.ceil(cells.length / columns);
  return Array.from({ length: columns }, (_, column) => cells.slice(column * rows, (column + 1) * rows));
};

const decorators = () =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      const drawings = STUDIO_SLIDES.map(({ id, source, model }) => {
        // Every component is drawn as a kind: the space graph's Generator is exercised by `StudioAgents`, and nine
        // compiled generators on one page would say nothing the one story does not.
        // Read-only, so each cell is the slide rather than nine editors: the rail, the actions and the inspectors
        // take a third of a cell this size, and this view is for comparing the drawings.
        const canvas = addTestCanvas(space.db, seedStudioSlide(source, model), { ...STUDIO_CANVAS, readonly: true });
        return space.db.add(Drawing.make({ name: `${id} · ${model.title}`, canvas }));
      });
      await space.db.flush();
      return square(drawings.map((drawing) => Cell.article(drawing)));
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/StudioDeck',
  render: ModuleContainer,
  decorators: decorators(),
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Every slide draws, and the one that places a space graph draws that too. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const views = await canvas.findAllByTestId('scene-view', undefined, { timeout: 60_000 });
    await expect(views.length).toBe(STUDIO_SLIDES.length);
    const graphs = STUDIO_SLIDES.filter(({ spaceGraph }) => spaceGraph).length;
    await expect(canvasElement.querySelectorAll('[data-testid="space-graph-node"]').length).toBe(graphs);
  },
};
