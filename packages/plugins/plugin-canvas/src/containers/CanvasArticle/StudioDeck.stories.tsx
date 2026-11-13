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
import { STUDIO_KINDS } from '../../testing/studio/kinds.ts';
import { STUDIO_SLIDES, type StudioSlide, seedSlide, studioSlide } from '../../testing/studio/slides.ts';
import { STUDIO_CANVAS } from '../../testing/studio/studio.ts';

/** Every kind the deck's slides use, contributed once for all of them. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioDeck'), name: 'Studio Deck Kinds' }),
).pipe(
  Plugin.addModule({
    id: 'studio-node-types',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed(
        Object.entries(STUDIO_KINDS).map(([type, spec]) =>
          Capability.contribute(CanvasCapabilities.NodeType, { type, spec }),
        ),
      ),
  }),
  Plugin.make,
);

/**
 * The cells as a square, in reading order: slide 1 top left, slide 3 top right, slide 9 bottom right. A
 * `ModuleLayout`'s outer array is its columns, so the deck is dealt across them rather than sliced down them —
 * sliced, column one would hold slides 1 to 3 and the deck would read downwards.
 */
const square = (cells: ModuleSpec[]): ModuleSpec[][] => {
  const columns = Math.max(1, Math.ceil(Math.sqrt(cells.length)));
  return Array.from({ length: columns }, (_, column) => cells.filter((_cell, index) => index % columns === column));
};

const decorators = (slides: readonly StudioSlide[] = STUDIO_SLIDES) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      const drawings = slides.map((slide) => {
        // Every component is drawn as a kind: the space graph's Generator is exercised by `StudioAgents`, and nine
        // compiled generators on one page would say nothing the one story does not.
        // Read-only, so each cell is the slide rather than nine editors: the rail, the actions and the inspectors
        // take a third of a cell this size, and this view is for comparing the drawings.
        const canvas = addTestCanvas(space.db, seedSlide(slide), {
          ...STUDIO_CANVAS,
          readonly: true,
        });
        return space.db.add(Drawing.make({ name: `${slide.id} · ${slide.title ?? slide.model.title}`, canvas }));
      });
      await space.db.flush();
      return square(drawings.map((drawing) => Cell.article(drawing)));
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/StudioDeck',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Every slide draws, and every component kind of the deck's table draws on the slide that places it. */
export const Default: Story = {
  decorators: decorators(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const views = await canvas.findAllByTestId('scene-view', undefined, { timeout: 60_000 });
    await expect(views.length).toBe(STUDIO_SLIDES.length);
    const count = (testid: string) => canvasElement.querySelectorAll(`[data-testid="${testid}"]`).length;
    await expect(count('graph-node')).toBe(STUDIO_SLIDES.filter(({ spaceGraph }) => spaceGraph).length);
    // The Hyperspace slide's three planks and its one field of spaces, and the Composer slide's window. A kind the
    // loader left as its placeholder draws none of these. The Plugins slide draws its consumers as cards, not as the
    // deck's pills, so the chip kind is registered and the deck uses none of it.
    await expect(count('plank-node')).toBe(3);
    await expect(count('substrate-node')).toBe(1);
    await expect(count('app-frame-node')).toBe(1);
    await expect(count('chip-node')).toBe(0);
    // The chips inside a card: the ECHO layers slide's Types grid and the Architecture slide's two service rows.
    await expect(count('studio-chips')).toBe(3);
  },
};

//
// One story per slide, so a slide has a link of its own to read, screenshot and compare against the deck's own
// render. They are the same drawing the nine-up places; only the number of cells differs.
//

/** A slide on its own, at the one cell's full size. */
const only = (id: string): Story => ({ decorators: decorators([studioSlide(id)]) });

export const Hyperspace = only('hyperspace');
export const EchoLayers = only('echo-layers');
export const Plugins = only('plugins');
export const Composer = only('composer');
export const Architecture = only('architecture');
export const Agents = only('agents');
export const Ontology = only('ontology');
export const Chat = only('chat');
export const Agent = only('agent');
