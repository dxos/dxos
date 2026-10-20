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

import { createCanvas, rootOf, writeViews } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';
import { Canvas } from '#types';

import { frameWithChildren, groupAndRotation, shapesAndArrow, textNoteAndFreeArrow } from './testing.ts';
import { tldrawToViews } from './tldraw.ts';

// Each story maps a tldraw sample and opens the result through the illustrator's article surface, as the app does.
const withImport = (records: Record<string, unknown>) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin()],
    onInit: async ({ space }) => {
      const canvas = space.db.add(createCanvas());
      Obj.update(canvas, (canvas) => {
        writeViews(canvas.content, tldrawToViews(records, { root: rootOf(canvas.content) }).views);
      });
      const drawing = space.db.add(Drawing.make({ name: 'Imported', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

// The tldraw drawing as plugin-tldraw draws it, beside the canvas it converts to.
const withConversion = (records: Record<string, unknown>, { snap }: { snap: boolean }) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), TldrawPlugin.make(), CanvasPlugin()],
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
  title: 'plugins/plugin-canvas/import/ImportTldraw',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The conversion side by side: the tldraw drawing (left) and the canvas made from it (right), with every shape snapped
 * to the canvas grid — the operation's default. Shapes become nodes, the bound arrows links, and the frame a View node.
 */
export const Conversion: Story = {
  decorators: withConversion(frameWithChildren(), { snap: true }),
};

/** As `Conversion`, without snapping: the canvas keeps tldraw's exact positions and sizes. */
export const ConversionExact: Story = {
  decorators: withConversion(frameWithChildren(), { snap: false }),
};

/**
 * Test:
 * 1. The rectangle and the ellipse render as nodes.
 * 2. The bound arrow renders as a link between them.
 */
export const ShapesAndArrow: Story = {
  decorators: withImport(shapesAndArrow()),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    for (const selector of ['[data-node-id="box"]', '[data-node-id="oval"]', '[data-link-id="arrow"]']) {
      await waitFor(() => expect(canvasElement.querySelector(selector)).not.toBeNull());
    }
  },
};

export const TextNoteAndFreeArrow: Story = {
  decorators: withImport(textNoteAndFreeArrow()),
};

/**
 * Test:
 * 1. The frame renders as a View node over its child View.
 */
export const Frame: Story = {
  decorators: withImport(frameWithChildren()),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="frame"]')).not.toBeNull());
  },
};

export const GroupAndRotation: Story = {
  decorators: withImport(groupAndRotation()),
};
