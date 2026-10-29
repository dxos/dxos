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
import { trim } from '@dxos/util';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { Canvas } from '#types';

import types from '../../capabilities/schema.ts';

/** A canvas over scenes written in `.dx`, opened through the illustrator's article as the app opens it. */
const withScenes = (text: string) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const stored = toEcho(Dsl.readScenes(text).document);
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
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/SceneArticle',
  render: ModuleContainer,
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A 2D drawing (A → B → C) in the scene article: the canvas's palette, actions, inspectors and display panel. */
export const Scene2D: Story = { decorators: withScenes(EXEMPLARS.links) };

/**
 * A single plain cube in the scene article, under the same floating panels as 2D.
 * 1. Click selects; Move, Rotate or Scale puts a gizmo on it; Undo and Redo step back and forth.
 * 2. Orbit (or the middle button) orbits; shift or the right button pans; the wheel zooms.
 * 3. Cube or Sphere places one where the pointer meets the ground.
 * 4. The display panel toggles the ground grid and picks the look; both are this viewer's own, like the orbit.
 */
export const Scene3D: Story = {
  decorators: withScenes(trim`
    scene cube dim=3d layout=cube name="Cube" {
      camera target=0,1,0 yaw=-45 pitch=30 distance=8 fov=0.8 projection=perspective
    }

    layout cube dim=3d {
      element box cube @ 0,1,0 scale=2 hue=blue surface=solid
    }
  `),
};
