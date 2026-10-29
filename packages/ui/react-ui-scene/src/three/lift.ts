//
// Copyright 2026 DXOS.org
//

//
// A 2D scene drawn through a 3D projection (design decision 11): each 2D element becomes a flat 3D one on the ground
// plane, so the 3D renderer can show a drawing from any camera. The 3D camera is the caller's, never stored (call 17).
//

import { type Scene } from '@dxos/scene';

import { type Viewport } from './camera.ts';

/** Canvas pixels per scene unit when a 2D scene is lifted. */
export const PIXELS_PER_UNIT = 100;

/** How thick a lifted 2D shape is, in scene units. */
const DEPTH = 0.04;

const FOV = 0.8;

/** The 3D kind each 2D kind is drawn as; a kind missing here keeps its name (links, groups, labels, child scenes). */
const KINDS: Readonly<Record<string, string>> = {
  rect: 'cube',
  note: 'cube',
  image: 'cube',
  ellipse: 'cylinder',
  polygon: 'cylinder',
  path: 'cube',
};

/** A canvas point on the ground plane; canvas y runs down the screen, which is −z seen from above (yaw 0). */
const toGround = ({ x, y }: Scene.Vec2): Scene.Vec3 => ({ x: x / PIXELS_PER_UNIT, y: 0, z: -y / PIXELS_PER_UNIT });

/** The top-down orthographic camera that shows what the 2D camera shows in a viewport of `viewport`. */
export const camera2DTo3D = (camera: Scene.Camera2D, viewport: Viewport): Scene.Camera3D => {
  const half = viewport.height / 2 / (camera.zoom * PIXELS_PER_UNIT);
  return {
    target: toGround(camera.center),
    yaw: 0,
    pitch: 90,
    distance: half / Math.tan(FOV / 2),
    fov: FOV,
    projection: 'orthographic',
  };
};

const liftElement = ({ center, size, rotation, layout: _layout, ...element }: Scene.Element2D): Scene.Element3D => ({
  ...element,
  kind: KINDS[element.kind] ?? element.kind,
  ...(center ? { position: toGround(center) } : {}),
  ...(size ? { scale: { x: size.width / PIXELS_PER_UNIT, y: DEPTH, z: size.height / PIXELS_PER_UNIT } } : {}),
  ...(rotation !== undefined ? { rotation: { x: 0, y: rotation, z: 0 } } : {}),
  ...(element.kind === 'scene' ? { props: { shape: 'cube', ...element.props } } : {}),
});

/** A 2D scene as a 3D one on the ground plane; a scene already 3D is kept. */
const liftRecord = (scene: Scene.SceneRecord): Scene.SceneRecord3D =>
  scene.dim === '3d'
    ? scene
    : {
        id: scene.id,
        dim: '3d',
        ...(scene.name !== undefined ? { name: scene.name } : {}),
        ...(scene.component !== undefined ? { component: scene.component } : {}),
        camera: camera2DTo3D(scene.camera, { width: 800, height: 600 }),
        elements: Object.fromEntries(
          Object.entries(scene.elements).map(([key, element]) => [key, liftElement(element)]),
        ),
      };

/** Every scene of a document lifted onto the ground plane, so the 3D renderer draws a 2D drawing. */
export const liftScene = (doc: Scene.SceneDocument): Scene.SceneDocument => ({ scenes: doc.scenes.map(liftRecord) });
