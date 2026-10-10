//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { DEFAULT_CELL } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import { Cell, ModuleContainer, type ResolvedCellProps, createStoryDecorators } from '@dxos/storybook-testing';

import { createCanvas, nodeKey, rootOf } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

// Dispatched through the illustrator's card surface, as a stack or popover shows it, so the story covers the variant
// dispatch as well as the card.
const DrawingCard = ({ object }: ResolvedCellProps) => (
  <Card.Root classNames='w-80'>
    <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
  </Card.Root>
);

const node = (scene: string, id: string, type: string, x: number, y: number, label: string) => ({
  kind: 'node',
  scene,
  node: {
    id,
    type,
    z: `a${id}`,
    center: { x, y },
    size: { width: 2 * DEFAULT_CELL, height: DEFAULT_CELL },
    label,
  },
});

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/CanvasCard',
  render: ModuleContainer,
  decorators: createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin()],
    onInit: async ({ space }) => {
      const canvas = space.db.add(createCanvas());
      const root = rootOf(canvas.content);
      invariant(root);
      Obj.update(canvas, (canvas) => {
        canvas.content[nodeKey('a')] = node(root, 'a', 'rect', -320, -160, 'DXOS');
        canvas.content[nodeKey('b')] = node(root, 'b', 'ellipse', 320, -160, 'ECHO');
        canvas.content[nodeKey('c')] = node(root, 'c', 'rect', 0, 192, 'EDGE');
      });
      const drawing = space.db.add(Drawing.make({ name: 'Canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing, { component: DrawingCard })]];
    },
  }),
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The drawing alone: no palette, panels, toolbars or grid. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-node-id]').length).toBe(3), { timeout: 10_000 });
    for (const testId of ['palette', 'properties', 'layers', 'about', 'scene-view-dock']) {
      await expect(canvas.queryByTestId(testId)).not.toBeInTheDocument();
    }
    await expect(canvasElement.querySelector('[role="toolbar"]')).toBeNull();
  },
};
