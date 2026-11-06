//
// Copyright 2026 DXOS.org
//

//
// A 2D scene drawn through a 3D projection (design decision 11): each 2D element becomes a flat 3D one on the ground
// plane, so the 3D renderer can show a drawing from any camera. The 3D camera is the caller's, never stored (call 17).
//

import { type Scene, flattenStyle, liftStyle } from '@dxos/scene';

// Type-only, so the root entry that exports lifting loads none of the 3D renderer.
import type { Viewport } from '../three/index.ts';

/** Canvas pixels per scene unit when a 2D scene is lifted. */
export const PIXELS_PER_UNIT = 100;

/** How thick a lifted 2D shape is, in scene units. */
const DEPTH = 0.04;

const FOV = 0.8;

/** The 3D kind each 2D kind is drawn as; a kind missing here keeps its name (links, groups, labels). */
const KINDS: Readonly<Record<string, string>> = {
  rect: 'cube',
  note: 'cube',
  image: 'cube',
  ellipse: 'cylinder',
  polygon: 'cylinder',
  path: 'cube',
};

/** A canvas point on the ground plane; canvas y runs down the screen, which is −z seen from above (yaw 0). */
const toGround = ({ x, y }: Scene.Vec2): Scene.Vec3 => ({
  x: x / PIXELS_PER_UNIT || 0,
  y: 0,
  z: -y / PIXELS_PER_UNIT || 0,
});

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

const liftKind = (kind: string): string => KINDS[kind] ?? kind;

const liftSize = ({ width, height }: Scene.Size2): Scene.Vec3 => ({
  x: width / PIXELS_PER_UNIT,
  y: DEPTH,
  z: height / PIXELS_PER_UNIT,
});

const liftElement = ({
  center,
  size,
  rotation,
  scale: _scale,
  overrides,
  ...element
}: Scene.Element2D): Scene.Element3D => ({
  ...element,
  ...(element.type !== undefined ? { type: liftKind(element.type) } : {}),
  ...(overrides ? { overrides: liftStyle(overrides) } : {}),
  ...(center ? { center: toGround(center) } : {}),
  ...(size ? { scale: liftSize(size) } : {}),
  ...(rotation !== undefined ? { rotation: { x: 0, y: rotation, z: 0 } } : {}),
});

const liftObject = ({ size, overrides, ...object }: Scene.Object2D): Scene.Object3D => ({
  ...object,
  ...(overrides ? { overrides: liftStyle(overrides) } : {}),
  type: liftKind(object.type),
  ...(size ? { scale: liftSize(size) } : {}),
});

/** A layout lifted onto the ground plane. */
export const liftLayout = (layout: Scene.LayoutRecord): Scene.LayoutRecord3D =>
  layout.dim === '3d'
    ? layout
    : {
        id: layout.id,
        dim: '3d',
        ...(layout.name !== undefined ? { name: layout.name } : {}),
        ...(layout.model !== undefined ? { model: layout.model } : {}),
        elements: Object.fromEntries(
          Object.entries(layout.elements).map(([key, element]) => [key, liftElement(element)]),
        ),
      };

const liftModel = (model: Scene.ModelRecord): Scene.ModelRecord3D =>
  model.dim === '3d'
    ? model
    : {
        id: model.id,
        dim: '3d',
        ...(model.name !== undefined ? { name: model.name } : {}),
        objects: Object.fromEntries(Object.entries(model.objects).map(([key, object]) => [key, liftObject(object)])),
      };

const liftSceneRecord = (scene: Scene.SceneRecord): Scene.SceneRecord3D =>
  scene.dim === '3d'
    ? scene
    : {
        id: scene.id,
        dim: '3d',
        ...(scene.name !== undefined ? { name: scene.name } : {}),
        layout: scene.layout,
        camera: camera2DTo3D(scene.camera, { width: 800, height: 600 }),
      };

/** Every scene, layout and model of a document lifted onto the ground plane, so the 3D renderer draws a 2D drawing. */
export const liftScene = (doc: Scene.SceneDocument): Scene.SceneDocument => ({
  scenes: doc.scenes.map(liftSceneRecord),
  layouts: doc.layouts.map(liftLayout),
  models: doc.models.map(liftModel),
});

/** The 2D kind each 3D kind flattens to; a kind missing here keeps its name (links, groups, labels). */
const FLAT_KINDS: Readonly<Record<string, string>> = {
  cube: 'rect',
  sphere: 'ellipse',
  cylinder: 'ellipse',
  cone: 'polygon',
  pyramid: 'polygon',
};

/** A ground point as a canvas point: the inverse of lifting, never `-0`. */
const toCanvas = ({ x, z }: Scene.Vec3): Scene.Vec2 => ({ x: x * PIXELS_PER_UNIT || 0, y: -z * PIXELS_PER_UNIT || 0 });

const flattenElement = ({ center, scale, rotation, overrides, ...element }: Scene.Element3D): Scene.Element2D => {
  const shape = element.type !== undefined && element.type !== 'link' && element.type !== 'group';
  return {
    ...element,
    ...(element.type !== undefined ? { type: FLAT_KINDS[element.type] ?? element.type } : {}),
    ...(overrides ? { overrides: flattenStyle(overrides) } : {}),
    ...(center ? { center: toCanvas(center) } : {}),
    ...(shape ? { size: { width: (scale?.x ?? 1) * PIXELS_PER_UNIT, height: (scale?.z ?? 1) * PIXELS_PER_UNIT } } : {}),
    ...(rotation?.y ? { rotation: rotation.y } : {}),
  };
};

/** A 3D layout as its top-down view: each element's ground footprint drawn as the 2D shape that matches its kind. */
export const flattenLayout = (layout: Scene.LayoutRecord): Scene.LayoutRecord2D =>
  layout.dim === '2d'
    ? layout
    : {
        id: layout.id,
        dim: '2d',
        ...(layout.name !== undefined ? { name: layout.name } : {}),
        ...(layout.model !== undefined ? { model: layout.model } : {}),
        elements: Object.fromEntries(
          Object.entries(layout.elements).map(([key, element]) => [key, flattenElement(element)]),
        ),
      };
