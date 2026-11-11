//
// Copyright 2026 DXOS.org
//

//
// The studio deck's three graph slides as canvas drawings, each built from its `.diagram` file and its sidecar, with a
// `card` element kind contributed the way a real plugin contributes one (`CanvasCapabilities.NodeType`). The slide's
// title and subtitle are not in the drawing: a presenter slide's heading carries them.
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
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

import types from '../../capabilities/schema.ts';
import { addTestCanvas } from '../../testing/canvas.ts';
import agentSource from '../../testing/studio/agent.diagram?raw';
import agentModel from '../../testing/studio/agent.json?raw';
import { cardSpec } from '../../testing/studio/Card.tsx';
import chatSource from '../../testing/studio/chat.diagram?raw';
import chatModel from '../../testing/studio/chat.json?raw';
import ontologySource from '../../testing/studio/ontology.diagram?raw';
import ontologyModel from '../../testing/studio/ontology.json?raw';
import { STUDIO_CANVAS, type StudioModel, parseStudioModel, seedStudioSlide } from '../../testing/studio/studio.ts';

const CardPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioCard'), name: 'Studio Card' }),
).pipe(
  Plugin.addModule({
    id: 'card-node-type',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed([Capability.contribute(CanvasCapabilities.NodeType, { type: 'card', spec: cardSpec })]),
  }),
  Plugin.make,
);

type Slide = { source: string; model: StudioModel };

const SLIDES: Record<string, Slide> = {
  ontology: { source: ontologySource, model: parseStudioModel(ontologyModel) },
  chat: { source: chatSource, model: parseStudioModel(chatModel) },
  agent: { source: agentSource, model: parseStudioModel(agentModel) },
};

const decorators = ({ source, model }: Slide, plugins: Plugin.Plugin[] = [CardPlugin()]) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), ...plugins],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, seedStudioSlide(source, model), STUDIO_CANVAS);
      const drawing = space.db.add(Drawing.make({ name: model.title, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/StudioCards',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Entities and how they relate; value types and containers alongside. Ten cards, ten straight connectors. */
export const Ontology: Story = {
  decorators: decorators(SLIDES.ontology),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(
      Object.keys(SLIDES.ontology.model.nodes).length,
    );
  },
};

/** What runs, what it records, what it uses and what it makes. Two toned cards and two dashed elbow routes. */
export const Chat: Story = {
  decorators: decorators(SLIDES.chat),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(Object.keys(SLIDES.chat.model.nodes).length);
  },
};

/** How agents pursue goals. Three labelled frames and five connectors with waypoints. */
export const Agent: Story = {
  decorators: decorators(SLIDES.agent),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(Object.keys(SLIDES.agent.model.nodes).length);
  },
};

/** The same slide with no plugin: every card falls back to the core base, a box showing its title. */
export const WithoutPlugin: Story = {
  decorators: decorators(SLIDES.ontology, []),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect(canvas.queryAllByTestId('card-node')).toHaveLength(0);
  },
};
