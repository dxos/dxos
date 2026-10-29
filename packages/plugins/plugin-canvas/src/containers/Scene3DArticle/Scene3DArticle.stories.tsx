//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { toEcho } from '@dxos/scene';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { Canvas } from '#types';

import types from '../../capabilities/schema.ts';

/**
 * A 3D canvas over the encapsulated exemplar, opened through the illustrator's article as the app opens it.
 * 1. Click selects; Move, Rotate or Scale puts a gizmo on it; Undo and Redo step back and forth.
 * 2. Double-click the Team shell to edit its parts; Escape goes back out.
 * 3. Cube or Sphere places one where the pointer meets the ground; the middle button orbits, the right one pans.
 * 4. The camera is written back to the scene after it rests, so reopening the story keeps it.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/Scene3DArticle',
  render: ModuleContainer,
  decorators: createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const stored = toEcho(Dsl.readScenes(EXEMPLARS.encapsulated).document);
      [...stored.models.values(), ...stored.layouts.values(), ...stored.scenes.values()].forEach((object) =>
        space.db.add(object),
      );
      const model = stored.models.values().next().value;
      const canvas = space.db.add(
        Obj.make(Canvas.Canvas, {
          settings: {},
          ...(model ? { model: Ref.make(model) } : {}),
          layouts: [...stored.layouts.values()].map((layout) => Ref.make(layout)),
          scenes: [
            Ref.make(stored.root),
            ...[...stored.scenes.values()].filter((scene) => scene !== stored.root).map((scene) => Ref.make(scene)),
          ],
        }),
      );
      const drawing = space.db.add(Drawing.make({ name: '3D canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  }),
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
