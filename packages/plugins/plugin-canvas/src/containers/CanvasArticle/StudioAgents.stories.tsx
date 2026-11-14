//
// Copyright 2026 DXOS.org
//

//
// Round 2 of the studio spike: the deck's Agents slide as a canvas drawing. Two things the round-1 graph slides did
// not need — a richer card (`feed-card`, contributed through `CanvasCapabilities.NodeType`) and a generated space
// graph (a `Generator` the drawing places and binds its four sub-agents to as readers).
// Findings: `packages/plugins/plugin-canvas/docs/STUDIO-CARDS.md`.
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
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities, Generator } from '#types';

import types from '../../capabilities/schema.ts';
import generatorParams from '../../components/Graph/generator/params.schema.json?raw';
import generatorSource from '../../components/Graph/generator/space-graph.generator.ts?raw';
import { addTestCanvas } from '../../testing/canvas.ts';
import agentsSource from '../../testing/studio/agents.diagram?raw';
import agentsModel from '../../testing/studio/agents.json?raw';
import { feedCardSpec } from '../../testing/studio/FeedCard.tsx';
import { type ComponentMode, STUDIO_CANVAS, parseStudioModel, seedStudioSlide } from '../../testing/studio/studio.ts';

/** A plugin contributing the slide's card, the way a real one contributes its own; the space graph is plugin-canvas's. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioFeedCard'), name: 'Studio Kinds' }),
).pipe(
  Plugin.addModule({
    id: 'studio-node-types',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed([Capability.contribute(CanvasCapabilities.NodeType, { type: 'feed-card', spec: feedCardSpec })]),
  }),
  Plugin.make,
);

const model = parseStudioModel(agentsModel);

/** The deck's accent is blue; the generator's schema defaults to violet, so the drawing names it. */
const SPACE_PARAMS = { picks: 2, hue: 'blue' };

type Options = { components?: ComponentMode; plugins?: Plugin.Plugin[] };

const decorators = ({ components = 'kind', plugins = [StudioKindsPlugin()] }: Options = {}) =>
  StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), ...plugins],
    onInit: async ({ space }) => {
      // The generator is an object in the space, exactly as `canvas.createGenerator` saves it; the drawing's
      // component node names it by reference and the view compiles it.
      const generator =
        components === 'generator'
          ? space.db.add(
              Generator.make({
                name: 'Space graph',
                description: 'One ECHO space: a connected graph of objects on a hexagonal lattice inside a circle.',
                source: generatorSource,
                params: JSON.parse(generatorParams),
              }),
            )
          : undefined;
      await space.db.flush();

      const canvas = addTestCanvas(
        space.db,
        seedStudioSlide(agentsSource, model, {
          components,
          generators: generator
            ? { 'space-graph': { reference: Generator.referenceOf(generator), params: SPACE_PARAMS } }
            : {},
        }),
        STUDIO_CANVAS,
      );
      const drawing = space.db.add(Drawing.make({ name: model.title, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'plugins/plugin-canvas/containers/StudioAgents',
  render: ModuleContainer.Root,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole slide: nine feed cards, S-curve links, and the space graph the four sub-agents read. */
export const Default: Story = {
  decorators: decorators(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const cards = await canvas.findAllByTestId('feed-card-node');
    await expect(cards.length).toBe(Object.keys(model.nodes).length);
    // Every card draws its feed strip, and the marked blocks take the deck's accent.
    await expect((await canvas.findAllByTestId('feed-strip')).length).toBe(cards.length);
    const marked = canvasElement.querySelectorAll('[data-testid="feed-strip"] [data-marked]');
    await expect(marked.length).toBe(
      Object.values(model.nodes).reduce((total, card) => total + Object.keys(card.feed?.marks ?? {}).length, 0),
    );
    // The deck's accent, from the theme tokens rather than a colour named in the view: the token is a light and a
    // dark value, and the block takes the one for the mode it is drawn in.
    const dark = getComputedStyle(marked[0]).colorScheme.includes('dark');
    await expect(getComputedStyle(marked[0]).backgroundColor).toBe(dark ? 'rgb(6, 197, 253)' : 'rgb(45, 111, 255)');
    // The space is an element of its own kind, so it is selectable and its fields are its configuration.
    const space = await canvas.findByTestId('graph-node');
    await expect(space.querySelectorAll('circle').length).toBeGreaterThan(100);
  },
};

/** The same slide with no kinds contributed: each card falls back to the core base, a box showing its title. */
export const WithoutPlugin: Story = {
  decorators: decorators({ plugins: [] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scene = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect(canvas.queryAllByTestId('feed-card-node')).toHaveLength(0);
    // Looked for where it is drawn: the Views list names every element too.
    await expect(await within(scene).findByText('Triage agent')).toBeInTheDocument();
  },
};

/**
 * The same space drawn by a `Generator` instead of an element kind: the geometry is the same module, but its
 * parameters are a blob rather than properties, and its reader links are its own paths rather than canvas links.
 */
export const WithGenerator: Story = {
  decorators: decorators({ components: 'generator' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('feed-card-node')).length).toBe(Object.keys(model.nodes).length);
    // The generator draws onto its own layer; there is no element to select or configure.
    await expect(canvas.queryAllByTestId('graph-node')).toHaveLength(0);
    // The view compiles the generator before it draws, which a loaded runner takes longer over than the default wait.
    await expect(await canvas.findByTestId('generator-layer', undefined, { timeout: 30_000 })).toBeInTheDocument();
  },
};
