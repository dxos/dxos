//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as TldrawPlugin from '@dxos/plugin-tldraw/TldrawPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { createCanvas, rootOf, writeViews } from '#model';
import { translations } from '#translations';
import { Canvas } from '#types';

import { frameWithChildren, shapesAndArrow, textNoteAndFreeArrow } from './testing.ts';
import { tldrawToViews } from './tldraw.ts';

// The tldraw drawing as plugin-tldraw draws it, beside the canvas it converts to.
const withConversion = (records: Record<string, unknown>, { snap }: { snap: boolean }) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), TldrawPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const source = space.db.add(
        Drawing.make({
          name: 'tldraw',
          canvas: space.db.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content: records })),
        }),
      );
      const canvas = space.db.add(createCanvas());
      Obj.update(canvas, (canvas) => {
        writeViews(canvas.content, tldrawToViews(records, { root: rootOf(canvas.content), snap }).views);
      });
      const converted = space.db.add(Drawing.make({ name: 'Canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(source)], [Cell.article(converted)]];
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/import/TldrawConversion',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

// Every story shows a tldraw sample (left, drawn by plugin-tldraw) beside the canvas it converts to (right). The
// samples are in `testing.ts`; each covers part of the mapping.

/**
 * A frame holding two linked shapes, and an arrow from outside bound to a shape inside it; snapped to the canvas grid,
 * the operation's default. The frame becomes a labelled rectangle on a layer under its shapes, grown out to the grid so
 * it still holds them; the shapes sit on the grid and stay on the drawing itself, so the arrow from outside stays bound.
 *
 * Test:
 * 1. The frame and the shapes inside it render as nodes of the one View.
 */
export const FrameSnapToGrid: Story = {
  decorators: withConversion(frameWithChildren(), { snap: true }),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    for (const id of ['frame', 'inner-a', 'inner-b', 'outside']) {
      await waitFor(() => expect(canvasElement.querySelector(`[data-node-id="${id}"]`)).not.toBeNull());
    }
  },
};

/** The same frame without snapping (`snap: false`): the canvas keeps tldraw's exact positions and sizes. */
export const FrameNoSnap: Story = {
  decorators: withConversion(frameWithChildren(), { snap: false }),
};

/**
 * A labelled, coloured rectangle and ellipse joined by a bound, labelled arrow: geo shapes become rect and ellipse
 * nodes with tldraw's colours, fill and dash, and the bound arrow a link that follows them.
 *
 * Test:
 * 1. The rectangle and the ellipse render as nodes.
 * 2. The bound arrow renders as a link between them.
 */
export const ShapesAndArrow: Story = {
  decorators: withConversion(shapesAndArrow(), { snap: true }),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    for (const selector of ['[data-node-id="box"]', '[data-node-id="oval"]', '[data-link-id="arrow"]']) {
      await waitFor(() => expect(canvasElement.querySelector(selector)).not.toBeNull());
    }
  },
};

/**
 * The shapes with no direct counterpart: free text becomes a note, a sticky a filled rectangle, an unbound curved arrow
 * a link with free ends, and a cloud the canvas cloud. A hexagon becomes a regular polygon and a star a rectangle, both
 * approximations, and a freehand stroke is skipped; the operation's result counts each.
 */
export const TextNoteAndFreeArrow: Story = {
  decorators: withConversion(textNoteAndFreeArrow(), { snap: true }),
};
