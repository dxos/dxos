//
// Copyright 2026 DXOS.org
//

import { type AbstractMesh, Engine, LinesMesh, Texture } from '@babylonjs/core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Scene } from '@dxos/scene';

import { renderList } from '../render-list.ts';
import { SceneRenderer3D } from '../renderer.ts';
import { DEFAULT_CAMERA } from './hooks.ts';
import { Scene3DView } from './Scene3DView.tsx';

const EXEMPLARS_3D = ['cube', 'cluster', 'encapsulated', 'hierarchy', 'solid'] as const;
const THEMES = ['cad', 'presentation', 'neu-light', 'neu-dark'] as const;
const CAMERAS = ['iso', 'front', 'close', 'wide'] as const;

type StoryProps = {
  exemplar: (typeof EXEMPLARS_3D)[number];
  theme: (typeof THEMES)[number];
  camera: (typeof CAMERAS)[number];
};

/** Variations on the scene's own camera: as written, straight on and orthographic, nearer, and a wide lens. */
const cameraFor = (base: Scene.Camera3D, preset: StoryProps['camera']): Scene.Camera3D => {
  switch (preset) {
    case 'front':
      return { ...base, yaw: 0, pitch: 0, projection: 'orthographic' };
    case 'close':
      return { ...base, distance: base.distance * 0.55 };
    case 'wide':
      return { ...base, fov: 1.2, distance: base.distance * 0.7, pitch: 50 };
    default:
      return base;
  }
};

const DefaultStory = ({ exemplar, theme, camera }: StoryProps) => {
  const document = useMemo(() => Dsl.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
  const root = document.scenes[0];
  const view = useMemo(() => (root?.dim === '3d' ? cameraFor(root.camera, camera) : undefined), [root, camera]);
  return <Scene3DView document={document} theme={theme} camera={view} />;
};

const meta = {
  title: 'ui/react-ui-canvas/components/Scene3DView',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    exemplar: { control: 'select', options: EXEMPLARS_3D },
    theme: { control: 'radio', options: THEMES },
    camera: { control: 'select', options: CAMERAS },
  },
  args: { exemplar: 'encapsulated', theme: 'presentation', camera: 'iso' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Matte solids in the Neu ground's tone on a ground of the same tone, edged in their hue; always light. */
export const NeuLight: Story = { args: { theme: 'neu-light' } };

/** The Neu look always dark, whatever the app's mode, as 2D's Neu Dark is. */
export const NeuDark: Story = { args: { theme: 'neu-dark' } };

/**
 * A renderer disposed while Babylon still decodes its PBR lookup texture, as a view unmounted on its first frame is: the
 * decode must not reach the disposed scene (an unhandled rejection fails the run).
 */
export const DisposedWhileDecoding: Story = {
  render: () => <canvas data-testid='canvas' width={320} height={240} />,
  play: async ({ canvasElement }) => {
    const canvas = await within(canvasElement).findByTestId<HTMLCanvasElement>('canvas');
    const engine = new Engine(canvas, true);
    const view = new SceneRenderer3D({ engine, theme: 'presentation', background: '#000000' });
    const document = Dsl.readScenes(EXEMPLARS.encapsulated).document;
    const root = document.scenes[0];
    view.render(renderList(document), root?.dim === '3d' ? root.camera : DEFAULT_CAMERA);
    const lookup = engine.scenes[0]?.environmentBRDFTexture;
    if (!(lookup instanceof Texture)) {
      throw new Error('The presentation look made no PBR lookup texture.');
    }
    await expect(lookup.isReady()).toBe(false);
    const loaded = new Promise<void>((resolve) => lookup.onLoadObservable.addOnce(() => resolve()));
    lookup.onLoadObservable.addOnce(() => view.dispose());
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await expect(engine.isDisposed).toBe(true);
  },
};

/**
 * A selected item orbited: its selection box draws on every frame of the orbit, as the item does, rather than only
 * now and then (a box rebuilt each frame is skipped until its material is ready, so it flickers).
 */
export const SelectionBoxWhileOrbiting: Story = {
  render: () => <canvas data-testid='canvas' width={320} height={240} />,
  play: async ({ canvasElement }) => {
    const canvas = await within(canvasElement).findByTestId<HTMLCanvasElement>('canvas');
    const engine = new Engine(canvas, true);
    const view = new SceneRenderer3D({ engine, theme: 'cad', background: '#000000' });
    const document = Dsl.readScenes(EXEMPLARS.cube).document;
    const root = document.scenes[0];
    const camera = root?.dim === '3d' ? root.camera : DEFAULT_CAMERA;
    const list = renderList(document);
    const key = list.items[0]?.key;
    if (key === undefined) {
      throw new Error('The cube exemplar places nothing.');
    }
    view.render(list, camera);
    view.select([key]);
    const scene = engine.scenes[0];
    let drawn = false;
    const watch = (mesh: AbstractMesh) =>
      mesh instanceof LinesMesh &&
      mesh.name.startsWith('box-') &&
      mesh.onAfterRenderObservable.add(() => (drawn = true));
    scene?.meshes.forEach(watch);
    scene?.onNewMeshAddedObservable.add(watch);
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    // Settled first, so the frames counted are the orbit's own.
    for (let index = 0; index < 10; index++) {
      view.render(list, camera);
      await frame();
    }
    const skipped: number[] = [];
    for (let index = 0; index < 30; index++) {
      drawn = false;
      view.render(list, { ...camera, yaw: camera.yaw + index * 3 });
      await frame();
      drawn || skipped.push(index);
    }
    view.dispose();
    await expect(skipped).toEqual([]);
  },
};
