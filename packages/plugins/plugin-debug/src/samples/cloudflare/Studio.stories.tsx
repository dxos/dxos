//
// Copyright 2026 DXOS.org
//

//
// The DXOS Deck template: nine diagrams, each a canvas drawing built from its `.dx` text, and the presentation that
// embeds them. The space is seeded by the template's own definition, so a story shows what applying it gives.
//
// A slide's story puts the drawing beside the canvas's DSL companion: the text on the right is read back out of the
// drawing, and it is the slide's file.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { DXN, Filter, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import { PresenterStoryPlugin } from '@dxos/plugin-presenter/testing';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';

import { translations } from '#translations';

import { DIAGRAMS, SLIDES, diagramTitle } from './deck.ts';
import { STUDIO_KINDS } from './kinds/registry.ts';
import * as StudioSpace from './StudioSpace.ts';

/** The variant plugin-canvas gives its DSL companion. */
const DSL_COMPANION = 'dsl';

/** The deck's kinds, contributed as plugin-debug contributes them, without the rest of the debug plugin. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.debugStudioKinds'), name: 'Studio Deck Kinds' }),
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

const definition = StudioSpace.make();

/** The space as the template seeds it, opened on the deck or on one slide's drawing beside its text. */
const decorators = (slide?: string) =>
  StoryHarness.decorators({
    types: [...definition.schemas],
    plugins: [
      IllustratorPlugin.make(),
      CanvasPlugin.make(),
      MarkdownPlugin.make(),
      PresenterPlugin.make(),
      // Present sets the deck's fullscreen plank, which only plugin-deck holds; this stands in for it.
      PresenterStoryPlugin.createPresenterStoryPlugin()(),
      StudioKindsPlugin(),
    ],
    onInit: async ({ space }) => {
      await EffectEx.runPromise(SampleSpace.applyTo(definition, space));
      await space.db.flush();
      if (slide === undefined) {
        const [deck] = await space.db.query(Filter.type(Presentation.Presentation)).run();
        if (!deck) {
          throw new Error('The template seeded no presentation.');
        }
        return [[Cell.article(deck)]];
      }
      const drawings = await space.db.query(Filter.type(Drawing.Drawing)).run();
      const drawing = drawings.find((drawing) => Obj.getLabel(drawing) === diagramTitle(slide));
      if (!drawing) {
        throw new Error(`The template seeded no ${slide} drawing.`);
      }
      return [[Cell.article(drawing)], [Cell.companion(drawing, DSL_COMPANION)]];
    },
  });

const meta: Meta = {
  title: 'plugins/plugin-debug/samples/Studio',
  render: () => <ModuleContainer.Root />,
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj;

/** The markdown slides, then one per diagram, each a drawing rather than a picture of one. */
export const Deck: Story = {
  decorators: decorators(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Under the 60s test timeout, so a tile that never appears reports which query missed.
    const timeout = 30_000;
    await canvas.findByTestId('presenter.slide-gallery.0', undefined, { timeout });
    const tiles = await canvas.findAllByTestId(/^presenter\.slide-gallery\.\d+$/, undefined, { timeout });
    await expect(tiles.length).toBe(SLIDES.length);
  },
};

/** A slide's drawing, and beside it the text the drawing reads back as: its own file. */
const slide = (id: string): Story => ({
  decorators: decorators(id),
  play: async ({ canvasElement }) => {
    const source = DIAGRAMS.find((diagram) => diagram.id === id)?.source ?? '';
    const [first] = source.split('\n');
    const editor = await within(canvasElement).findByTestId('canvas-dsl.editor', undefined, { timeout: 30_000 });
    await waitFor(() => expect(editor.textContent).toContain(first), { timeout: 30_000 });
  },
});

export const ReAct = slide('react');
export const Agents = slide('agents');
export const Superagent = slide('superagent');
export const Echo = slide('echo');
export const Hyperspace = slide('hyperspace');
export const App = slide('app');
export const Plugins = slide('plugins');
export const Architecture = slide('architecture');
