//
// Copyright 2026 DXOS.org
//

import type * as Scene from './Scene.ts';

/** Test builders for small documents. */
export const CAMERA_2D: Scene.Camera2D = { center: { x: 0, y: 0 }, zoom: 1 };
export const CAMERA_3D: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

const byId = <T extends { id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

export const layout2D = (id: string, elements: readonly Scene.Element2D[], model?: string): Scene.LayoutRecord2D => ({
  id,
  dim: '2d',
  ...(model ? { model } : {}),
  elements: byId(elements),
});

export const layout3D = (id: string, elements: readonly Scene.Element3D[], model?: string): Scene.LayoutRecord3D => ({
  id,
  dim: '3d',
  ...(model ? { model } : {}),
  elements: byId(elements),
});

export const model2D = (id: string, objects: readonly Scene.Object2D[]): Scene.ModelRecord2D => ({
  id,
  dim: '2d',
  objects: byId(objects),
});

export const model3D = (id: string, objects: readonly Scene.Object3D[]): Scene.ModelRecord3D => ({
  id,
  dim: '3d',
  objects: byId(objects),
});

export const scene2D = (id: string, layout = id): Scene.SceneRecord2D => ({
  id,
  dim: '2d',
  layout,
  camera: CAMERA_2D,
});

export const scene3D = (id: string, layout = id): Scene.SceneRecord3D => ({
  id,
  dim: '3d',
  layout,
  camera: CAMERA_3D,
});
