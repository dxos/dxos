//
// Copyright 2026 DXOS.org
//

//
// A drawing beside its DSL companion, both through the plugins' own surfaces: the article is the canvas variant's,
// the companion is this plugin's `dsl` surface keyed on the drawing. Edit the text and press Rebuild to redraw;
// move a box on the canvas and the text follows.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Dsl, applyCommands } from '@dxos/diagram';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { SceneHandler } from '@dxos/react-ui-canvas';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import { trim } from '@dxos/util';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';

import types from '../../capabilities/schema.ts';
import { DSL_COMPANION } from '../../constants.ts';
import { addTestCanvas } from '../../testing/canvas.ts';

/** A slide said as intent: no coordinates, so the companion opens on this text. */
const INTENT = trim`
  diagram kind=grid size=1200x600 cols="1fr 2fr 1fr" gap=48 padding=32

  group clients "Clients" gap=16 autoRows=72 alignContent=center {
    node web "Web app"
    node cli "CLI"
  }

  group core "Core" cols=2 gap=16 padding=16 border=true {
    node graph "Graph"
    node feeds "Feeds"
    node sync "Sync"
    node index "Index"
  }

  group services "Services" gap=16 autoRows=72 alignContent=center {
    node mail "Mail"
    node search "Search"
  }

  edge web -> graph
  edge sync -- mail path=line stroke=dashed
`;

/** Boxes someone placed: no grid holds them, so there is no intent and the companion opens on the boxes. */
const PLACED = trim`
  object notes @ 0,0 {
    rect idea 0,0 220x100 "Idea"
    rect draft 320,60 220x100 "Draft"
    rect review 640,0 220x100 "Review"
    arrow idea-draft idea -> draft
    arrow draft-review draft -> review stroke=dashed
  }
`;

const story = (name: string, source: string): Story => ({
  decorators: StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, (content) => {
        const { commands, problems } = Dsl.parse(source);
        const errors = problems.filter(({ severity }) => severity === 'error');
        if (errors.length > 0) {
          throw new Error(`${name} does not parse: ${errors.map(({ message }) => message).join(' · ')}`);
        }
        applyCommands(content, commands, SceneHandler);
      });
      const drawing = space.db.add(Drawing.make({ name, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)], [Cell.companion(drawing, DSL_COMPANION)]];
    },
  }),
});

const meta: Meta = {
  title: 'plugins/plugin-canvas/containers/CanvasDsl',
  render: () => <ModuleContainer.Root />,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj;

/**
 * 1. The companion shows `diagram kind=grid …`, the text the drawing was written as.
 * 2. Change a label in the text; Rebuild becomes enabled. Press it: the drawing shows the new label.
 * 3. Press "Show boxes": the same drawing as placed grid boxes. Press "Show intent" to go back.
 * 4. Type something that does not parse and press Rebuild: the footer names the problem and the drawing is unchanged.
 * 5. Press "Discard edits": the text is the drawing's again.
 */
export const Default = story('intent', INTENT);

/**
 * 1. The companion shows `object notes …` and the footer says why there is no intent.
 * 2. Drag a box on the canvas: its coordinates change in the text.
 * 3. Edit a coordinate in the text and press Rebuild: the box moves.
 */
export const Placed = story('placed', PLACED);

/** The companion reads the drawing in both forms, and Rebuild waits for an edit. */
export const Test: Story = {
  ...story('test', INTENT),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('canvas-dsl.editor', undefined, { timeout: 30_000 });
    await waitFor(() => expect(editor.textContent).toContain('diagram kind=grid'), { timeout: 30_000 });
    await expect(editor.textContent).toContain('group core "Core"');
    await expect(await canvas.findByTestId('canvas-dsl.rebuild')).toBeDisabled();

    await userEvent.click(await canvas.findByTestId('canvas-dsl.form'));
    await waitFor(() =>
      expect(within(canvasElement).getByTestId('canvas-dsl.editor').textContent).toContain('grid core-body'),
    );
    await userEvent.click(await canvas.findByTestId('canvas-dsl.form'));
    await waitFor(() =>
      expect(within(canvasElement).getByTestId('canvas-dsl.editor').textContent).toContain('diagram kind=grid'),
    );
  },
};
