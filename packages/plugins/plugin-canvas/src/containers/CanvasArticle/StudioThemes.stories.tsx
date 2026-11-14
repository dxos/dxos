//
// Copyright 2026 DXOS.org
//

//
// Each studio slide twice, in two columns: the same drawing on a canvas whose theme pins `neu-light` and on one that
// pins `neu-dark`. A pinned theme sets `color-scheme` on its own canvas container, and the deck tokens
// (`testing/studio/theme.css`) are `light-dark()` pairs resolved where they are drawn — so the two copies take
// different tokens on one page, whichever mode the app itself is in.
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
import { cardSpec } from '../../testing/studio/Card.tsx';
import chatSource from '../../testing/studio/chat.diagram?raw';
import chatModel from '../../testing/studio/chat.json?raw';
import { feedCardSpec } from '../../testing/studio/FeedCard.tsx';
import ontologySource from '../../testing/studio/ontology.diagram?raw';
import ontologyModel from '../../testing/studio/ontology.json?raw';
import { type Generators, STUDIO_CANVAS, parseStudioModel, seedStudioSlide } from '../../testing/studio/studio.ts';

/** Both card kinds, so one plugin serves every slide. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioKinds'), name: 'Studio Kinds' }),
).pipe(
  Plugin.addModule({
    id: 'studio-node-types',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed([
        Capability.contribute(CanvasCapabilities.NodeType, { type: 'card', spec: cardSpec }),
        Capability.contribute(CanvasCapabilities.NodeType, { type: 'feed-card', spec: feedCardSpec }),
      ]),
  }),
  Plugin.make,
);

type Slide = { source: string; model: string; generated?: boolean };

const SLIDES: Record<string, Slide> = {
  ontology: { source: ontologySource, model: ontologyModel },
  chat: { source: chatSource, model: chatModel },
  agents: { source: agentsSource, model: agentsModel, generated: true },
};

/** The two themes shown together; both pin a mode, so neither follows the app. */
const THEMES = ['neu-light', 'neu-dark'] as const;

const decorators = ({ source, model: modelSource, generated }: Slide) =>
  StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      const model = parseStudioModel(modelSource);
      const generator = generated
        ? space.db.add(
            Generator.make({
              name: 'Space graph',
              source: generatorSource,
              params: JSON.parse(generatorParams),
            }),
          )
        : undefined;
      await space.db.flush();

      const generators: Generators = generator
        ? { 'space-graph': { reference: Generator.referenceOf(generator), params: { picks: 2, hue: 'blue' } } }
        : {};
      // One drawing per theme, each with its own canvas: a theme is a property of the canvas, not of the view.
      const drawings = THEMES.map((theme) => {
        const canvas = addTestCanvas(space.db, seedStudioSlide(source, model, { generators }), {
          ...STUDIO_CANVAS,
          theme,
        });
        return space.db.add(Drawing.make({ name: `${model.title} · ${theme}`, canvas }));
      });
      await space.db.flush();
      // Outer array = columns, so the two sit side by side.
      return drawings.map((drawing) => [Cell.article(drawing)]);
    },
  });

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'plugins/plugin-canvas/containers/StudioThemes',
  render: ModuleContainer.Root,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Both canvases draw, and each one's cards take the tokens of the mode its theme pins. */
const bothModes = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  await expect((await canvas.findAllByTestId('scene-view', undefined, { timeout: 30_000 })).length).toBe(2);
  const schemes = [...canvasElement.querySelectorAll('[data-testid="scene-view"]')].map(
    (view) => getComputedStyle(view).colorScheme,
  );
  await expect(schemes).toEqual(['light', 'dark']);
};

export const Ontology: Story = { decorators: decorators(SLIDES.ontology), play: bothModes };
export const Chat: Story = { decorators: decorators(SLIDES.chat), play: bothModes };
export const Agents: Story = { decorators: decorators(SLIDES.agents), play: bothModes };
