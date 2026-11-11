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
import * as Schema from 'effect/Schema';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { type ElementKindSpec, type NodeViewProps, TextPart } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

import types from '../../capabilities/schema.ts';
import { addTestCanvas } from '../../testing/canvas.ts';
import agentSource from '../../testing/studio/agent.diagram?raw';
import agentModel from '../../testing/studio/agent.json?raw';
import chatSource from '../../testing/studio/chat.diagram?raw';
import chatModel from '../../testing/studio/chat.json?raw';
import ontologySource from '../../testing/studio/ontology.diagram?raw';
import ontologyModel from '../../testing/studio/ontology.json?raw';
import { type StudioModel, parseStudioModel, seedStudioSlide } from '../../testing/studio/studio.ts';

//
// The card kind: the deck's `.d-card.simple` — a Phosphor icon, a title, a soft raised shadow, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level.
//

const cardFields = {
  /** The card's title, in the core base's `label`, so it still reads where the kind is unknown. */
  label: Schema.String,
  /** A Phosphor icon name as the deck writes it (`users-three`), without the `ph--…--regular` wrapping. */
  icon: Schema.optional(Schema.String.annotate({ title: 'Icon' })),
  /** An accent, drawn as the card's outline (`#2d6fff`). */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
};

const CardNode = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('card'), ...cardFields });

const isCardNode = (
  node: NodeViewProps['node'],
): node is NodeViewProps['node'] & Schema.Struct.Type<typeof cardFields> => node.type === 'card';

const CardNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isCardNode(node)) {
    return null;
  }
  return (
    <div
      className='dx-cover flex items-center gap-3 px-4 rounded-xl bg-baseSurface'
      data-testid='card-node'
      style={{
        boxShadow: node.tone
          ? `0 1px 2px rgb(0 0 0 / 0.06), 0 6px 16px rgb(0 0 0 / 0.08), inset 0 0 0 2px ${node.tone}`
          : '0 1px 2px rgb(0 0 0 / 0.06), 0 6px 16px rgb(0 0 0 / 0.08)',
      }}
    >
      <Icon.Icon
        icon={`ph--${node.icon ?? 'square'}--regular`}
        size='lg'
        classNames='shrink-0'
        style={node.tone ? { color: node.tone } : undefined}
      />
      <TextPart part='label' text={node.label} editing={editing} classNames='grow truncate text-lg'>
        {node.label}
      </TextPart>
    </div>
  );
};

const cardSpec: ElementKindSpec = {
  name: 'Card',
  icon: 'ph--cards--regular',
  key: 'C',
  schema: CardNode,
  component: CardNodeView,
  create: ({ id, z, center, size }) => ({ type: 'card', id, z, center, size, label: 'Card' }),
  defaultSize: { width: 236, height: 66 },
  resizable: true,
  parts: [{ field: 'label' }],
};

/** A plugin contributing the card kind, the way plugin-uml contributes its own. */
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
      const canvas = addTestCanvas(space.db, seedStudioSlide(source, model));
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
