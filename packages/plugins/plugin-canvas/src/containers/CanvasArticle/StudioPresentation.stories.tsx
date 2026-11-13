//
// Copyright 2026 DXOS.org
//

//
// The studio deck as a presentation: a slide per diagram, each embedding the drawing rather than a picture of it, so
// the deck is presented from the same scenes {@link StudioDeck} lays out nine-up.
//
// It lives beside the nine-up story because the kinds the slides draw are contributed here ({@link STUDIO_KINDS});
// nothing in the app registers them yet, so a space template would show the DSL's placeholders instead.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN, EID } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import { createPresenterStoryPlugin } from '@dxos/plugin-presenter/PresenterStoryPlugin';
import type * as SlideTheme from '@dxos/plugin-presenter/SlideTheme';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

import types from '../../capabilities/schema.ts';
import { addTestCanvas } from '../../testing/canvas.ts';
import { STUDIO_KINDS } from '../../testing/studio/kinds.ts';
import { STUDIO_SLIDES } from '../../testing/studio/slides.ts';
import { STUDIO_CANVAS, seedStudioSlide, studioPageFrame } from '../../testing/studio/studio.ts';

/** The deck's look: the studio's own accent, and its fonts. */
const THEME: SlideTheme.Settings = { accent: '#2d6fff', font: 'space-grotesk', monoFont: 'fira' };

const DESCRIPTION =
  'The studio deck as canvas drawings: ECHO as a hyperspace of spaces, its layers, the plugin model, Composer, ' +
  'the architecture, agents and their feeds, the ontology, a chat and an agent at work.';

/** A plugin contributing the studio element kinds, since a drawing of the deck is drawn by them. */
const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioPresentation'), name: 'Studio Deck Kinds' }),
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

/** How far a slide may magnify the page. A fit stops at 1:1 by default, and a slide is wider than the deck's page. */
const FIT_ZOOM = 4;

/** A slide of the deck: its title, then the drawing. */
const slide = (title: string, drawing: Drawing.Drawing): string =>
  [
    '---',
    'layout: default',
    '---',
    '',
    `# ${title}`,
    '',
    `<Surface ref="${EID.make({ entityId: drawing.id })}" />`,
    '',
  ].join('\n');

type StoryArgs = {
  /** Outlines each slide's own box and the box its drawing is given, to see where the embed sits in the slide. */
  borders?: boolean;
};

/** The outlines `borders` draws: the box the slide gives the embed (red), and the canvas viewport inside it (cyan). */
const BORDERS = `
  dx-surface > * { outline: 2px solid color-mix(in oklch, red 60%, transparent); }
  [data-testid="scene-view"] { outline: 2px solid color-mix(in oklch, cyan 60%, transparent); }
`;

const decorators = createStoryDecorators<StoryArgs>(({ args }) => ({
  types: [Drawing.Drawing, Drawing.Canvas, Presentation.Presentation, Presentation.Slide, ...types],
  plugins: [
    IllustratorPlugin.make(),
    CanvasPlugin.make(),
    MarkdownPlugin.make(),
    PresenterPlugin.make(),
    // Present sets the deck's fullscreen plank, which only plugin-deck holds; this stands in for it, as the
    // presenter's own stories do.
    createPresenterStoryPlugin()(),
    StudioKindsPlugin(),
  ],
  onInit: async ({ space }) => {
    const seeded = STUDIO_SLIDES.map(
      ({ id, source, model, labels, remap, spread, balance, gap, frames, uniform, sizes }) => {
        // Read-only: a slide is looked at, and the rail would take a corner of every one.
        const canvas = addTestCanvas(
          space.db,
          seedStudioSlide(source, model, { labels, remap, spread, balance, gap, frames, uniform, sizes }),
          {
            ...STUDIO_CANVAS,
            readonly: true,
            // The deck's page, over what this slide draws: one size for all nine, so they open at one scale, and centred
            // on the slide's own content, so none of them sits off to a side of the box ({@link studioPageFrame}).
            fitFrame: studioPageFrame(model),
            fitZoom: FIT_ZOOM,
          },
        );
        return { model, drawing: space.db.add(Drawing.make({ name: `${id} · ${model.title}`, canvas })) };
      },
    );
    const deck = space.db.add(
      Presentation.make({
        name: 'Studio',
        description: DESCRIPTION,
        theme: THEME,
        slides: seeded.map(({ model, drawing }) => slide(model.title, drawing)),
      }),
    );
    await space.db.flush();
    return [[Cell.article(deck)]];
  },
  Wrapper: ({ children }: PropsWithChildren) => (
    <>
      {args.borders && <style>{BORDERS}</style>}
      {children}
    </>
  ),
}));

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/containers/StudioPresentation',
  render: () => <ModuleContainer />,
  decorators,
  argTypes: { borders: { control: 'boolean' } },
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Nine slides, one per diagram, each a drawing of the deck rather than a picture of one. */
export const Default: Story = {
  // On, so the box a slide gives its drawing is visible without turning the control on first.
  args: { borders: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('presenter.slide-grid.0', undefined, { timeout: 60_000 });
    const tiles = await canvas.findAllByTestId(/^presenter\.slide-grid\.\d+$/, undefined, { timeout: 60_000 });
    await expect(tiles.length).toBe(STUDIO_SLIDES.length);
  },
};
