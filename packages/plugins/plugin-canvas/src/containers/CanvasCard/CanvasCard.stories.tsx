//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Dsl } from '@dxos/diagram';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { DEFAULT_CELL } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import { toEcho } from '@dxos/scene';
import { Cell, ModuleContainer, type ResolvedCellProps, createStoryDecorators } from '@dxos/storybook-testing';
import { trim } from '@dxos/util';

import * as CanvasPlugin from '#meta';
import { createCanvas, nodeKey, rootOf } from '#model';
import { translations } from '#translations';
import { Canvas as CanvasFormat } from '#types';

import types from '../../capabilities/schema.ts';

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

const legacyDrawing = () =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
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
  });

/** A 3D canvas over one cube, from `.dx`, as a card shows it. */
const cubeDrawing = () =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const stored = toEcho(
        Dsl.readScenes(trim`
          scene cube dim=3d layout=cube name="Cube" {
            camera target=0,1,0 yaw=-45 pitch=30 distance=8 fov=0.8 projection=perspective
          }

          layout cube dim=3d {
            element box cube @ 0,1,0 scale=2 hue=blue surface=solid
          }
        `).document,
      );
      [...stored.layouts.values(), ...stored.scenes.values()].forEach((object) => space.db.add(object));
      const canvas = space.db.add(
        Obj.make(CanvasFormat.Canvas, {
          settings: {},
          layouts: [...stored.layouts.values()].map((layout) => Ref.make(layout)),
          scenes: [Ref.make(stored.root)],
        }),
      );
      const drawing = space.db.add(Drawing.make({ name: '3D canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing, { component: DrawingCard })]];
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/CanvasCard',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The drawing alone: no palette, panels, toolbars or grid. */
export const Default: Story = { decorators: legacyDrawing() };

/** The default story, driven: its steps run as a play test. */
export const Test: Story = {
  decorators: legacyDrawing(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-node-id]').length).toBe(3), { timeout: 10_000 });
    for (const testId of ['palette', 'properties', 'layers', 'views', 'scene-view-dock']) {
      await expect(canvas.queryByTestId(testId)).not.toBeInTheDocument();
    }
    await expect(canvasElement.querySelector('[role="toolbar"]')).toBeNull();
  },
};

/** A 3D canvas's card: the cube from its authored camera, with no grid, panels or toolbars. */
export const Scene3D: Story = { decorators: cubeDrawing() };
