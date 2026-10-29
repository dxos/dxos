//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Entity, Filter, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type URI } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';

import { canvasViewAspect } from '../../containers/CanvasArticle/view-state.ts';
import * as ArchitectureSpace from './ArchitectureSpace.ts';
import {
  type DiagramSet,
  architectureDiagrams,
  diagramFiles,
  edgeDiagrams,
  DIAGRAM_COMMANDS as files,
  loadDiagramSet,
} from './index.ts';

type StoryArgs = {
  /** The template document opened as the article. */
  document?: 'Composer' | 'DXOS' | 'EDGE' | 'ECHO design';
  /** Opens the template's ECHO presentation instead of a document. */
  deck?: boolean;
  /** The diagram stories' drawings open read-only: nothing is selected, and no tool, handle, port or panel edits them. */
  readonly?: boolean;
};

const definition = ArchitectureSpace.make();

// The space is seeded by the template's own definition, as `SpaceOperation.ApplyTemplate` applies it.
const withTemplate = createStoryDecorators<StoryArgs>(({ args }) => ({
  types: [...definition.schemas],
  plugins: [
    IllustratorPlugin.make(),
    CanvasPlugin.make(),
    MarkdownPlugin.make(),
    MermaidPlugin.make(),
    PresenterPlugin.make(),
    SheetPlugin.make(),
  ],
  onInit: async ({ space }) => {
    await EffectEx.runPromise(SampleSpace.applyTo(definition, space));
    await space.db.flush();
    if (args.deck) {
      const [deck] = await space.db.query(Filter.type(Presentation.Presentation)).run();
      if (!deck) {
        throw new Error('The template seeded no presentation.');
      }
      return [[Cell.article(deck)]];
    }
    const documents = await space.db.query(Filter.type(Markdown.Document)).run();
    const document = documents.find((document) => Obj.getLabel(document) === args.document);
    if (!document) {
      throw new Error(`The template seeded no ${args.document} document.`);
    }
    return [[Cell.article(document)]];
  },
}));

type ReadonlyViewProps = PropsWithChildren<{ canvas: Promise<URI.URI>; readonly: boolean }>;

/** Sets the article's read-only view state once the seeded canvas exists; the view state outlives a reload, so both ways. */
const ReadonlyView = ({ canvas, readonly, children }: ReadonlyViewProps) => {
  const viewState = Hooks.useCapability(AttentionCapabilities.ViewState);
  useEffect(() => {
    // The canvas is seeded during client init, after this wrapper mounts.
    void canvas.then((contextId) => viewState.update(canvasViewAspect, contextId, (state) => ({ ...state, readonly })));
  }, [canvas, readonly, viewState]);
  return <>{children}</>;
};

// One drawing per diagram of the set; the overview opens as the article and its drill-down boxes open the others.
const withDiagrams = (set: DiagramSet) =>
  createStoryDecorators<StoryArgs>(({ args }) => {
    const canvas = Promise.withResolvers<URI.URI>();
    return {
      types: [Drawing.Drawing, Drawing.Canvas],
      plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
      onInit: async ({ space }) => {
        const root = await loadDiagramSet(space.db, set);
        await space.db.flush();
        const target = await root.canvas.load();
        canvas.resolve(Entity.getURI(target));
        return [[Cell.article(root)]];
      },
      Wrapper: ({ children }) => (
        <ReadonlyView canvas={canvas.promise} readonly={args.readonly === true}>
          {children}
        </ReadonlyView>
      ),
    };
  });

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/samples/Template',
  render: () => <ModuleContainer />,
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

const documentArgs: Pick<Story, 'decorators' | 'argTypes'> = {
  decorators: withTemplate,
  argTypes: { document: { control: 'inline-radio', options: ['Composer', 'DXOS', 'EDGE', 'ECHO design'] } },
};

/** The Composer document, which links DXOS and EDGE and embeds the Composer architecture. */
export const Default: Story = {
  ...documentArgs,
  args: { document: 'Composer' },
};

/** The default story, driven: its steps run as a play test. */
export const Test: Story = {
  ...documentArgs,
  args: { document: 'Composer' },
  // The editor draws headings as lines rather than heading elements, so the document is recognised by its text.
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 60_000 })).toBeVisible();
    await waitFor(() => expect(canvasElement.textContent).toContain('A local-first workspace of plugins'), {
      timeout: 10_000,
    });
  },
};

/** The DXOS document, embedding the data stack. */
export const Dxos: Story = { ...documentArgs, args: { document: 'DXOS' } };

/** The EDGE document, embedding the EDGE architecture. */
export const Edge: Story = { ...documentArgs, args: { document: 'EDGE' } };

/** The ECHO design document: eight chapters embedding three ECHO diagrams and the benchmarks sheet. */
export const EchoDesign: Story = { ...documentArgs, args: { document: 'ECHO design' } };

/** The ECHO deck, presented: types, the CRDT, spaces, queries, feeds, replication, migration and agents. */
export const Echo: Story = {
  ...documentArgs,
  args: { deck: true },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: 'ECHO' }, { timeout: 30_000 }),
    ).toBeInTheDocument();
  },
};

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

/** The Composer diagram alone: app layer, SDK and data, and EDGE; the framework, data, plugin, compute and EDGE boxes open a level each. */
export const ComposerDiagram: Story = {
  decorators: withDiagrams(composer),
  args: { readonly: true },
  play: play(composer),
};

/** The EDGE diagram alone: clients, the gateway and the services; the router, db, compute and hub boxes open a level each. */
export const EdgeDiagram: Story = { decorators: withDiagrams(edge), args: { readonly: true }, play: play(edge) };
