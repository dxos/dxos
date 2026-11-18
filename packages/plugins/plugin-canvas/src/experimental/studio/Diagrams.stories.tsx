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

import { json as jsonLanguage } from '@codemirror/lang-json';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Dsl, applyCommands } from '@dxos/diagram';
import { diagram as diagramLanguage } from '@dxos/diagram/extension';
import { DXN } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { SceneHandler } from '@dxos/react-ui-canvas';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { composable } from '@dxos/react-ui/Util';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { type Canvas, CanvasCapabilities, Generator } from '#types';

import types from '../../capabilities/schema.ts';
import generatorParams from '../../components/Graph/generator/params.schema.json?raw';
import generatorSource from '../../components/Graph/generator/space-graph.generator.ts?raw';
import { CanvasLayoutBuilder, editCanvasContent, readCanvasContent } from '../../model/canvas-content.ts';
import { addTestCanvas } from '../../testing/canvas.ts';
import agentSource from './agent.diagram?raw';
import agentModel from './agent.json?raw';
import agentsSource from './agents.diagram?raw';
import agentsModel from './agents.json?raw';
import { cardSpec } from './Card.tsx';
import chatSource from './chat.diagram?raw';
import chatModel from './chat.json?raw';
import { feedCardSpec } from './FeedCard.tsx';
import ontologySource from './ontology.diagram?raw';
import ontologyModel from './ontology.json?raw';
import { STUDIO_KINDS } from './registry.ts';
import { type StudioSlide, seedSlide, studioSlide } from './slides.ts';
import {
  type ComponentMode,
  type Generators,
  STUDIO_CANVAS,
  type StudioModel,
  parseStudioModel,
  seedStudioSlide,
} from './studio.ts';

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

/**
 * The canvas the story seeded, for the column beside it. `onInit` runs during client init, before anything renders,
 * and the harness hands the layout to `ModuleContainer` rather than to the story — so the editor reads the canvas
 * from here instead of through props it has no way to receive.
 */
const seeded: { canvas?: Canvas.Canvas } = {};

/** The drawing as scene DSL: one `object` statement per shape, which is what a drawing serializes to. */
const printCanvas = (canvas: Canvas.Canvas): string => Dsl.print(CanvasLayoutBuilder.read(canvas).scene);

/**
 * The drawing as the records it is actually stored as. The DSL is a second way of saying the same drawing, so
 * showing the two side by side is how a loss is SEEN rather than measured: a kind, a marker or a route present in
 * the records and absent from the text is the whole class of defect this bench exists to catch. It is also what a
 * model would emit if a drawing were authored as JSON instead of as text, which is worth weighing by eye — the
 * records run 3–6x the size of the DSL for the same drawing.
 */
const printRecords = (canvas: Canvas.Canvas): string => JSON.stringify(readCanvasContent(canvas), null, 2);

type SourceView = 'dsl' | 'json';

/**
 * One editor per view, re-created when the view changes: CodeMirror takes its language at construction, so this
 * remounts rather than reconfiguring a live editor. The DSL text lives in the parent, so a remount keeps an edit.
 */
type TextPaneProps = {
  value: string;
  view: SourceView;
  onTextChange?: (text: string) => void;
};

/**
 * `composable()`, not a bare `forwardRef`: `Panel.Body asChild` hands its child the body's class, `data-part` and
 * ref, and only a component built this way is marked as able to take them. A plain one is warned about and
 * outlined in dev, which is the right diagnostic — dropping them leaves the body unstyled.
 */
const TextPane = composable<HTMLDivElement, TextPaneProps>(
  ({ value, view, onTextChange, className, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const { parentRef, focusAttributes } = useTextEditor(
      () => ({
        initialValue: value,
        extensions: [
          createBasicExtensions({ lineNumbers: true, readOnly: onTextChange === undefined }),
          createThemeExtensions({ themeMode, syntaxHighlighting: true }),
          ...(view === 'dsl' ? [diagramLanguage({ layout: false })] : [jsonLanguage()]),
          ...(onTextChange ? [listener({ onChange: ({ text }) => onTextChange(text) })] : []),
        ],
      }),
      [themeMode, view],
    );
    // `Panel.Body asChild` hands this component the body's own class, `data-part` and ref, so it has to be a real
    // slot: dropping them leaves the body unstyled, and ark-ui outlines the child in red to say so.
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        parentRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, parentRef],
    );
    return (
      <div
        {...props}
        {...focusAttributes}
        ref={setRef}
        className={['overflow-hidden', className].filter(Boolean).join(' ')}
        data-testid='studio-source.editor'
      />
    );
  },
);

/**
 * The DSL in the diagram language mode, applied to the canvas only when asked. Applying on a timer after each
 * keystroke cannot work: a document mid-edit parses to whatever the parser can still make sense of, so the drawing
 * was rebuilt from half-typed text — and `applyCommands` is a full sync, which deleted every shape the broken parse
 * had dropped. `Parse` reports without touching the drawing, `Rebuild` is the one action that writes.
 */
const SourceEditor = ({ canvas }: { canvas: Canvas.Canvas }) => {
  const [initialValue] = useState(() => printCanvas(canvas));
  const [source, setSource] = useState(initialValue);
  const [view, setView] = useState<SourceView>('dsl');
  // Read again on every switch, so the records show the drawing as it is NOW rather than as it was at mount: a
  // `Rebuild` between the two views is exactly when the difference is worth seeing.
  const [records, setRecords] = useState(() => printRecords(canvas));
  const [problems, setProblems] = useState<readonly { severity: string; message: string }[]>([]);
  const [status, setStatus] = useState<string>();

  // `read` rather than `compile`: these are scene statements, which carry their own coordinates, so there is no
  // layout to solve — and solving one would move the shapes the slide placed.
  const parse = useCallback(() => {
    const { commands, problems: found } = Dsl.read(source);
    const errors = found.filter(({ severity }) => severity === 'error');
    setProblems(errors);
    const objects = commands.filter(({ op }) => op === 'upsert-object').length;
    setStatus(errors.length > 0 ? undefined : `${objects} object${objects === 1 ? '' : 's'}`);
    return { commands, errors };
  }, [source]);

  const rebuild = useCallback(() => {
    const { commands, errors } = parse();
    if (errors.length > 0) {
      return;
    }
    // `Rebuild` means the text IS the drawing, so the canvas is cleared first. `applyCommands` only touches the
    // objects its commands name — it re-renders each one and removes nothing else — so an object deleted from the
    // text had no command to remove it and simply stayed on the canvas.
    //
    // Only DSL-managed records go: a shape drawn by hand is in no text and clearing it would lose work that the
    // text cannot bring back. Both halves are one edit, so the canvas is never written empty.
    let cleared = 0;
    let drawn = 0;
    editCanvasContent(canvas, (content) => {
      for (const [key, record] of Object.entries(content)) {
        const identity = SceneHandler.identify(record);
        if (identity) {
          delete content[key];
          if (identity.part === undefined) {
            cleared++;
          }
        }
      }
      drawn = applyCommands(content, commands, SceneHandler).upserted.length;
    });
    setStatus(`${drawn} drawn, ${cleared} cleared`);
  }, [parse, canvas]);

  const onChange = useCallback((text: string) => {
    setSource(text);
    setStatus(undefined);
  }, []);

  const onViewChange = useCallback(
    (next: string) => {
      if (next !== 'dsl' && next !== 'json') {
        return;
      }
      if (next === 'json') {
        setRecords(printRecords(canvas));
      }
      setView(next);
    },
    [canvas],
  );

  // A panel, as the article beside it is: the toolbar is its header, the editor its body, and the status bar its
  // footer — so the three bands come from the primitive rather than from a flex column measured by hand.
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root data-testid='studio-source.toolbar'>
          <Button.Root
            variant='ghost'
            icon='ph--check-circle--regular'
            label='Parse'
            data-testid='studio-source.parse'
            onClick={parse}
          />
          <Button.Root
            variant='ghost'
            icon='ph--arrows-clockwise--regular'
            label='Rebuild'
            data-testid='studio-source.rebuild'
            onClick={rebuild}
            disabled={view === 'json'}
          />
          {/* The records are shown, not edited: writing them back is a different action from rebuilding a drawing
              out of its text, and it would have no undo here. */}
          <Toolbar.ToggleGroup type='single' value={view} onValueChange={onViewChange} aria-label='View'>
            <ToggleGroup.Item
              value='dsl'
              icon='ph--text-align-left--regular'
              label='DSL'
              iconOnly
              data-testid='studio-source.view-dsl'
            />
            <ToggleGroup.Item
              value='json'
              icon='ph--brackets-curly--regular'
              label='JSON'
              iconOnly
              data-testid='studio-source.view-json'
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      {/* `asChild`, so the editor IS the body: `.dx-panel-body` is a grid row, not a positioning context, and an
          absolutely filled child inside it pins to the panel instead and covers the header and footer. */}
      <Panel.Body asChild>
        {view === 'dsl' ? (
          <TextPane key='dsl' view='dsl' value={source} onTextChange={onChange} />
        ) : (
          <TextPane key='json' view='json' value={records} />
        )}
      </Panel.Body>
      <Panel.Footer classNames='p-1'>
        {problems.length > 0 ? (
          <span className='text-xs text-error-text' data-testid='studio-source.problems'>
            {problems.map(({ message }) => message).join(' · ')}
          </span>
        ) : (
          <span className='text-xs text-fg-muted' data-testid='studio-source.status'>
            {view === 'json' ? `${records.split('\n').length} lines of records` : (status ?? ' ')}
          </span>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};

/** Waits for `onInit` to have seeded, since the canvas is filled during client init rather than on render. */
const SourceColumn = () => {
  const [canvas, setCanvas] = useState(seeded.canvas);
  useEffect(() => {
    if (canvas) {
      return;
    }
    const timer = setInterval(() => seeded.canvas && setCanvas(seeded.canvas), 100);
    return () => clearInterval(timer);
  }, [canvas]);
  return canvas ? <SourceEditor canvas={canvas} /> : <div className='dx-base-surface' />;
};

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

export const Hyperspace = slide('hyperspace');
export const Echo = slide('echo-layers');
export const Ontology = slide('ontology');
export const Plugins = slide('plugins');
export const Composer = slide('composer');
export const Architecture = slide('architecture');
export const Agents = slide('agents');
export const Chat = slide('chat');
export const Agent = slide('agent');

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
