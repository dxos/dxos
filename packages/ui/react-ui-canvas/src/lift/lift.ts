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
import { DEFAULT_SIZES, shapeNodeOutline } from '../utils/index.ts';
import { prismMesh } from './prism.ts';

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

type Props = Readonly<Record<string, unknown>>;

const isParams = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((item) => typeof item === 'number');

/**
 * A parametric shape stood up as a solid: the `mesh` over its recipe's outline in a frame of `size`, keeping the
 * recipe and parameters it was drawn from so it flattens back to the shape. Undefined for any other kind.
 */
const liftShape = (
  type: string | undefined,
  props: Props | undefined,
  size: Scene.Size2 | undefined,
): { type: string; props: Props } | undefined => {
  const recipe = props?.recipe;
  if (type !== 'shape' || typeof recipe !== 'string') {
    return undefined;
  }
  const frame = size && size.width > 0 && size.height > 0 ? size : DEFAULT_SIZES.shape;
  const params = isParams(props?.params) ? props.params : undefined;
  const mesh = prismMesh(
    shapeNodeOutline({ recipe, size: frame, params }).map(({ x, y }) => ({ x: x / frame.width, y: y / frame.height })),
  );
  return mesh ? { type: 'mesh', props: { ...props, mesh } } : undefined;
};

/**
 * An element that places a shape through its `object` was given a solid of its own when lifted; flattened, the solid
 * goes, since the shape draws its outline again. An element with a kind of its own is `flattenShape`'s.
 */
const withoutShapeMesh = ({ type, object, props }: Scene.Element3D): { props?: Props } => {
  if (type !== undefined || object === undefined || props?.mesh === undefined) {
    return {};
  }
  const { mesh: _mesh, ...kept } = props;
  return { props: kept };
};

/** A solid that was lifted from a parametric shape, as that shape again: its mesh is the recipe's to remake. */
const flattenShape = (
  type: string | undefined,
  props: Props | undefined,
): { type: string; props: Props } | undefined => {
  if (type !== 'mesh' || typeof props?.recipe !== 'string') {
    return undefined;
  }
  const { mesh: _mesh, ...kept } = props;
  return { type: 'shape', props: kept };
};

const liftSize = ({ width, height }: Scene.Size2): Scene.Vec3 => ({
  x: width / PIXELS_PER_UNIT,
  y: DEPTH,
  z: height / PIXELS_PER_UNIT,
});

/**
 * An element lifted onto the ground. One that places a parametric shape, by its own kind or by its `object`'s,
 * carries the solid of the outline it draws: its recipe and parameters over the object's, in its own frame, since
 * the object's solid is the outline at the object's frame.
 */
const liftElement = (
  { center, size, rotation, scale: _scale, overrides, ...element }: Scene.Element2D,
  object?: Scene.Object2D,
): Scene.Element3D => {
  const props = object?.props || element.props ? { ...object?.props, ...element.props } : undefined;
  const shape = liftShape(element.type ?? object?.type, props, size ?? object?.size);
  return {
    ...element,
    ...(shape
      ? {
          ...(element.type !== undefined ? { type: shape.type } : {}),
          props: { ...element.props, mesh: shape.props.mesh },
        }
      : element.type !== undefined
        ? { type: liftKind(element.type) }
        : {}),
    ...(overrides ? { overrides: liftStyle(overrides) } : {}),
    ...(center ? { center: toGround(center) } : {}),
    ...(size ? { scale: liftSize(size) } : {}),
    ...(rotation !== undefined ? { rotation: { x: 0, y: rotation, z: 0 } } : {}),
  };
};

const liftObject = ({ size, overrides, ...object }: Scene.Object2D): Scene.Object3D => ({
  ...object,
  ...(overrides ? { overrides: liftStyle(overrides) } : {}),
  ...(liftShape(object.type, object.props, size) ?? { type: liftKind(object.type) }),
  ...(size ? { scale: liftSize(size) } : {}),
});

/**
 * A layout lifted onto the ground plane. `objects` are its model's, which an element placing one takes its kind,
 * frame and properties from; without them an element is lifted by its own fields alone.
 */
export const liftLayout = (
  layout: Scene.LayoutRecord,
  objects: Readonly<Record<string, Scene.Object2D>> = {},
): Scene.LayoutRecord3D =>
  layout.dim === '3d'
    ? layout
    : {
        id: layout.id,
        dim: '3d',
        ...(layout.name !== undefined ? { name: layout.name } : {}),
        ...(layout.model !== undefined ? { model: layout.model } : {}),
        elements: Object.fromEntries(
          Object.entries(layout.elements).map(([key, element]) => [
            key,
            liftElement(element, element.object === undefined ? undefined : objects[element.object]),
          ]),
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
  layouts: doc.layouts.map((layout) => {
    const model = layout.model === undefined ? undefined : doc.models.find(({ id }) => id === layout.model);
    return liftLayout(layout, model?.dim === '2d' ? model.objects : {});
  }),
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
    ...(flattenShape(element.type, element.props) ??
      (element.type !== undefined ? { type: FLAT_KINDS[element.type] ?? element.type } : {})),
    ...withoutShapeMesh(element),
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
