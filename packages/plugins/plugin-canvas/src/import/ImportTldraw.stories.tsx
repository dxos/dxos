//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { createCanvas, rootOf, writeViews } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

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
