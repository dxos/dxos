//
// Copyright 2026 DXOS.org
//

//
// The studio deck's one storybook: every slide, the nine-up deck, and each slide beside its own scene DSL — the
// drawing on the left, the text that describes it on the right, and edits applied back to the live canvas. The
// `editor` arg hides that second column. The DSL is READ OUT of the drawing rather than loaded from the slide's
// `.diagram` file, because these slides are laid out from a `SlideSpec` and the file holds the deck's own geometry
// instead — printing the canvas is the only text that matches what is on screen.
//
// The bench is `plugin-illustrator`'s `Constraints` story turned around: there the DSL is the source and the drawing
// is derived, here the drawing is the subject and the DSL is its serialization.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Dsl, applyCommands } from '@dxos/diagram';
import { DXN } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { SceneHandler } from '@dxos/react-ui-canvas';
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
import { cardSpec } from '../components/Card.tsx';
import { feedCardSpec } from '../components/FeedCard.tsx';
import { STUDIO_KINDS } from '../components/registry.ts';
import agentSource from '../diagrams/agent.diagram?raw';
import agentIntent from '../diagrams/agent.dx?raw';
import agentGrid from '../diagrams/agent.grid.diagram?raw';
import agentModel from '../diagrams/agent.json?raw';
import agentsSource from '../diagrams/agents.diagram?raw';
import agentsIntent from '../diagrams/agents.dx?raw';
import agentsGrid from '../diagrams/agents.grid.diagram?raw';
import agentsModel from '../diagrams/agents.json?raw';
import architectureIntent from '../diagrams/architecture.dx?raw';
import architectureGrid from '../diagrams/architecture.grid.diagram?raw';
import chatSource from '../diagrams/chat.diagram?raw';
import chatIntent from '../diagrams/chat.dx?raw';
import chatGrid from '../diagrams/chat.grid.diagram?raw';
import chatModel from '../diagrams/chat.json?raw';
import composerIntent from '../diagrams/composer.dx?raw';
import composerGrid from '../diagrams/composer.grid.diagram?raw';
import echoIntent from '../diagrams/echo.dx?raw';
import echoGrid from '../diagrams/echo.grid.diagram?raw';
import hyperspaceIntent from '../diagrams/hyperspace.dx?raw';
import hyperspaceGrid from '../diagrams/hyperspace.grid.diagram?raw';
import ontologySource from '../diagrams/ontology.diagram?raw';
import ontologyIntent from '../diagrams/ontology.dx?raw';
import ontologyGrid from '../diagrams/ontology.grid.diagram?raw';
import ontologyModel from '../diagrams/ontology.json?raw';
import pluginsIntent from '../diagrams/plugins.dx?raw';
import pluginsGrid from '../diagrams/plugins.grid.diagram?raw';
import { type StudioSlide, seedSlide, studioSlide } from '../diagrams/slides.ts';
import {
  type ComponentMode,
  type Generators,
  STUDIO_CANVAS,
  type StudioModel,
  parseStudioModel,
  seedStudioSlide,
} from '../diagrams/studio.ts';
import { SourceColumn, seeded } from './source-column.tsx';

/** Every kind the deck's slides use, contributed once for all of them. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioSource'), name: 'Studio Source Kinds' }),
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

type StoryArgs = { editor: boolean };

const decorators = (slide: StudioSlide) =>
  StoryHarness.decorators<StoryArgs>(({ args }) => ({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      // Read-only, because the DSL beside it is the editing surface: an editable canvas brings its rail, toolbars
      // and inspector, which take a third of the pane and overlay the column next to it.
      const canvas = addTestCanvas(space.db, seedSlide(slide), { ...STUDIO_CANVAS, readonly: true });
      // Assigned, never `??=`: each story seeds a space of its own, and keeping the first story's canvas leaves the
      // editor reading one whose space has since been torn down — which prints as an empty document.
      seeded.canvas = canvas;
      const drawing = space.db.add(Drawing.make({ name: `${slide.id} · ${slide.title ?? slide.model.title}`, canvas }));
      await space.db.flush();
      const cell = Cell.article(drawing);
      return args.editor ? [[cell], [{ object: drawing, component: SourceColumn }]] : [[cell]];
    },
  }));

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/experimental/Diagrams',
  render: () => <ModuleContainer.Root />,
  argTypes: { editor: { description: 'Show the scene DSL beside the drawing.', control: 'boolean' } },
  args: { editor: true },
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

const slide = (id: string): Story => ({ decorators: decorators(studioSlide(id)) });

/**
 * A slide seeded from DSL text alone: no `SlideSpec`, no sidecar, no baked coordinates. The document is a
 * hierarchy of grids, so every position on screen is solved from a rule — which is what makes the text beside it
 * the thing to edit rather than a printout of what was already placed.
 */
const fromSource = (name: string, source: string): Story => ({
  decorators: StoryHarness.decorators<StoryArgs>(({ args }) => ({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(
        space.db,
        (content) => {
          // `parse`, not `read`: a document of intent has no commands until its diagram is laid out.
          const { commands, problems } = Dsl.parse(source);
          const errors = problems.filter(({ severity }) => severity === 'error');
          if (errors.length > 0) {
            throw new Error(`${name} does not parse: ${errors.map(({ message }) => message).join(' · ')}`);
          }
          applyCommands(content, commands, SceneHandler);
        },
        { ...STUDIO_CANVAS, readonly: true },
      );
      seeded.canvas = canvas;
      const drawing = space.db.add(Drawing.make({ name, canvas }));
      await space.db.flush();
      const cell = Cell.article(drawing);
      return args.editor ? [[cell], [{ object: drawing, component: SourceColumn }]] : [[cell]];
    },
  })),
});

export const Hyperspace = fromSource('hyperspace', hyperspaceGrid);
export const Echo = fromSource('echo', echoGrid);
export const Ontology = fromSource('ontology', ontologyGrid);
export const Plugins = fromSource('plugins', pluginsGrid);
export const Composer = fromSource('composer', composerGrid);
export const Architecture = fromSource('architecture', architectureGrid);
export const Agents = fromSource('agents', agentsGrid);
export const Chat = fromSource('chat', chatGrid);
export const Agent = fromSource('agent', agentGrid);

//
// The same nine slides written as intent (`diagram kind=grid` with `group`, `node` and `edge`) rather than as grid
// boxes. Each lowers to the boxes of the story above it, so the two stories of a slide draw the same thing.
//

export const HyperspaceIntent = fromSource('hyperspace', hyperspaceIntent);
export const EchoIntent = fromSource('echo', echoIntent);
export const OntologyIntent = fromSource('ontology', ontologyIntent);
export const PluginsIntent = fromSource('plugins', pluginsIntent);
export const ComposerIntent = fromSource('composer', composerIntent);
export const ArchitectureIntent = fromSource('architecture', architectureIntent);
export const AgentsIntent = fromSource('agents', agentsIntent);
export const ChatIntent = fromSource('chat', chatIntent);
export const AgentIntent = fromSource('agent', agentIntent);

//
// The Agents slide through the deck import rather than its spec: the richer `feed-card` kind, and the space graph
// drawn either as an element kind or by a `Generator`. These are renderings of one slide, which is why they sit
// beside the deck's own stories rather than in a storybook of their own.
//

/** A plugin contributing the slide's card, the way a real one contributes its own; the space graph is plugin-canvas's. */
const FeedCardPlugin = Plugin.define(
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

const agentsSlideModel = parseStudioModel(agentsModel);

/** The deck's accent is blue; the generator's schema defaults to violet, so the drawing names it. */
const SPACE_PARAMS = { picks: 2, hue: 'blue' };

type Options = { components?: ComponentMode; plugins?: Plugin.Plugin[] };

const agentsDecorators = ({ components = 'kind', plugins = [FeedCardPlugin()] }: Options = {}) =>
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
        seedStudioSlide(agentsSource, agentsSlideModel, {
          components,
          generators: generator
            ? { 'space-graph': { reference: Generator.referenceOf(generator), params: SPACE_PARAMS } }
            : {},
        }),
        STUDIO_CANVAS,
      );
      const drawing = space.db.add(Drawing.make({ name: agentsSlideModel.title, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

/** The whole slide: nine feed cards, S-curve links, and the space graph the four sub-agents read. */
export const AgentsKinds: Story = {
  decorators: agentsDecorators(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const cards = await canvas.findAllByTestId('feed-card-node');
    await expect(cards.length).toBe(Object.keys(agentsSlideModel.nodes).length);
    // Every card draws its feed strip, and the marked blocks take the deck's accent.
    await expect((await canvas.findAllByTestId('feed-strip')).length).toBe(cards.length);
    const marked = canvasElement.querySelectorAll('[data-testid="feed-strip"] [data-marked]');
    await expect(marked.length).toBe(
      Object.values(agentsSlideModel.nodes).reduce(
        (total, card) => total + Object.keys(card.feed?.marks ?? {}).length,
        0,
      ),
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
export const AgentsWithoutPlugin: Story = {
  decorators: agentsDecorators({ plugins: [] }),
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
export const AgentsWithGenerator: Story = {
  decorators: agentsDecorators({ components: 'generator' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('feed-card-node')).length).toBe(
      Object.keys(agentsSlideModel.nodes).length,
    );
    // The generator draws onto its own layer; there is no element to select or configure.
    await expect(canvas.queryAllByTestId('graph-node')).toHaveLength(0);
    // The view compiles the generator before it draws, which a loaded runner takes longer over than the default wait.
    await expect(await canvas.findByTestId('generator-layer', undefined, { timeout: 30_000 })).toBeInTheDocument();
  },
};

//
// The card kinds on their own slides, and the two themes side by side: renderings of the same diagrams, so they
// belong with them rather than in storybooks of their own.
//

const CardOnlyPlugin = Plugin.define(
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

type CardSlide = { source: string; model: StudioModel };

const CARD_SLIDES: Record<string, CardSlide> = {
  ontology: { source: ontologySource, model: parseStudioModel(ontologyModel) },
  chat: { source: chatSource, model: parseStudioModel(chatModel) },
  agent: { source: agentSource, model: parseStudioModel(agentModel) },
};

const cardDecorators = ({ source, model }: CardSlide, plugins: Plugin.Plugin[] = [CardOnlyPlugin()]) =>
  StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), ...plugins],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, seedStudioSlide(source, model), STUDIO_CANVAS);
      const drawing = space.db.add(Drawing.make({ name: model.title, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

/** Entities and how they relate; value types and containers alongside. Ten cards, ten straight connectors. */
export const CardsOntology: Story = {
  decorators: cardDecorators(CARD_SLIDES.ontology),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(
      Object.keys(CARD_SLIDES.ontology.model.nodes).length,
    );
  },
};

/** What runs, what it records, what it uses and what it makes. Two toned cards and two dashed elbow routes. */
export const CardsChat: Story = {
  decorators: cardDecorators(CARD_SLIDES.chat),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(
      Object.keys(CARD_SLIDES.chat.model.nodes).length,
    );
  },
};

/** How agents pursue goals. Three labelled frames and five connectors with waypoints. */
export const CardsAgent: Story = {
  decorators: cardDecorators(CARD_SLIDES.agent),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('card-node')).length).toBe(
      Object.keys(CARD_SLIDES.agent.model.nodes).length,
    );
  },
};

/** The same slide with no plugin: every card falls back to the core base, a box showing its title. */
export const CardsWithoutPlugin: Story = {
  decorators: cardDecorators(CARD_SLIDES.ontology, []),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect(canvas.queryAllByTestId('card-node')).toHaveLength(0);
  },
};

/** Every kind the slides draw, from the one table: the Agents slide's space graph is a kind here too. */
const ThemeKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioKinds'), name: 'Studio Kinds' }),
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

type ThemeSlide = { source: string; model: string; generated?: boolean };

const THEME_SLIDES: Record<string, ThemeSlide> = {
  ontology: { source: ontologySource, model: ontologyModel },
  chat: { source: chatSource, model: chatModel },
  agents: { source: agentsSource, model: agentsModel, generated: true },
};

/** The two themes shown together; both pin a mode, so neither follows the app. */
const THEMES = ['neu-light', 'neu-dark'] as const;

const themeDecorators = ({ source, model: modelSource, generated }: ThemeSlide) =>
  StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), ThemeKindsPlugin()],
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

/** Both canvases draw, and each one's cards take the tokens of the mode its theme pins. */
const bothModes = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  await expect((await canvas.findAllByTestId('scene-view', undefined, { timeout: 30_000 })).length).toBe(2);
  const schemes = [...canvasElement.querySelectorAll('[data-testid="scene-view"]')].map(
    (view) => getComputedStyle(view).colorScheme,
  );
  await expect(schemes).toEqual(['light', 'dark']);
};

export const ThemesOntology: Story = { decorators: themeDecorators(THEME_SLIDES.ontology), play: bothModes };
export const ThemesChat: Story = { decorators: themeDecorators(THEME_SLIDES.chat), play: bothModes };
export const ThemesAgents: Story = { decorators: themeDecorators(THEME_SLIDES.agents), play: bothModes };
