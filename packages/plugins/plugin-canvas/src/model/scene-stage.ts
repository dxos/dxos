//
// Copyright 2026 DXOS.org
//

//
// A scene document (`@dxos/scene`) as an animator stage: its root scene's elements are the targets, a sample's values
// patch them in a copy, and the binding gives effects their positions. Pure of any view, so the animator can call it
// ahead of time and send the binding to the effect worker.
//

import { type AnimatableKind, animatableProperties } from '@dxos/animation';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { Scene, radiusOf } from '@dxos/scene';

/** Elements that are drawn and so may be keyed: hidden operands and groups draw nothing of their own. */
const isTarget = (element: Scene.Element): boolean =>
  !element.hidden && element.kind !== 'group' && !Scene.RESERVED_IDS.includes(element.id);

const PROPERTIES_2D: Readonly<Record<string, AnimatableKind>> = animatableProperties(Scene.Element2D);
const PROPERTIES_3D: Readonly<Record<string, AnimatableKind>> = animatableProperties(Scene.Element3D);

const getPath = (value: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, key) => (typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined),
      value,
    );

/** A copy of `record` with `path` set to `value`, copying each object on the way so siblings are kept. */
const setPath = <T extends object>(record: T, path: string, value: unknown): T => {
  const [key, ...rest] = path.split('.');
  const current: unknown = Reflect.get(record, key);
  const next =
    rest.length === 0
      ? value
      : setPath(typeof current === 'object' && current !== null ? current : {}, rest.join('.'), value);
  return { ...record, [key]: next };
};

const rootOf = (doc: Scene.SceneDocument): Scene.SceneRecord | undefined => doc.scenes[0];

/** The root scene's drawn elements, each with its keyable paths and their resting values. */
export const sceneTargets = (doc: Scene.SceneDocument): AnimatorCapabilities.StageTarget[] => {
  const root = rootOf(doc);
  if (!root) {
    return [];
  }
  const properties = Object.entries(root.dim === '2d' ? PROPERTIES_2D : PROPERTIES_3D).map(([path, kind]) => ({
    path,
    kind,
  }));
  return Object.values(root.elements)
    .filter(isTarget)
    .map((element) => ({
      id: element.id,
      label: element.label ?? element.id,
      properties,
      values: Object.fromEntries(
        properties.flatMap(({ path }) => {
          const value = getPath(element, path);
          return value === undefined ? [] : [[path, value]];
        }),
      ),
    }));
};

/** The document with the sample's values written into its root scene's elements; the input is not changed. */
export const applySample = (doc: Scene.SceneDocument, sample: AnimatorCapabilities.Sample): Scene.SceneDocument => {
  const [root, ...rest] = doc.scenes;
  if (!root) {
    return doc;
  }
  const patch = <E extends Scene.Element>(elements: Readonly<Record<string, E>>): Record<string, E> =>
    Object.fromEntries(
      Object.entries(elements).map(([key, element]) => {
        const values = sample.values[element.id];
        return [
          key,
          values
            ? Object.entries(values).reduce((patched, [path, value]) => setPath(patched, path, value), element)
            : element,
        ];
      }),
    );
  const patched: Scene.SceneRecord =
    root.dim === '2d' ? { ...root, elements: patch(root.elements) } : { ...root, elements: patch(root.elements) };
  return { scenes: [patched, ...rest] };
};

/** Where each drawn element and link is at a sample, in the stage's units, for effects; plain data throughout. */
export const sceneBinding = (
  doc: Scene.SceneDocument,
  sample: AnimatorCapabilities.Sample,
): AnimatorCapabilities.StageBinding => {
  const root = rootOf(applySample(doc, sample));
  if (!root) {
    return { objects: {}, links: [] };
  }
  const objects: Record<string, AnimatorCapabilities.BoundObject> = {};
  if (root.dim === '2d') {
    for (const element of Object.values(root.elements)) {
      if (isTarget(element) && element.center) {
        const { x, y } = element.center;
        const size = element.size ?? { width: 0, height: 0 };
        objects[element.id] = {
          id: element.id,
          position: { x, y, z: 0 },
          radius: Math.max(size.width, size.height) / 2,
          opacity: element.style?.opacity ?? 1,
          ...(element.style?.hue ? { color: element.style.hue } : {}),
        };
      }
    }
  } else {
    for (const element of Object.values(root.elements)) {
      if (isTarget(element) && element.center) {
        const { x, y, z } = element.center;
        objects[element.id] = {
          id: element.id,
          position: { x, y, z },
          radius: radiusOf(element),
          opacity: element.style?.opacity ?? 1,
          ...(element.style?.hue ? { color: element.style.hue } : {}),
        };
      }
    }
  }
  const links = Object.values(root.elements).flatMap((element) => {
    const from = element.from && objects[element.from.element];
    const to = element.to && objects[element.to.element];
    return element.kind === 'link' && from && to
      ? [{ id: element.id, from: from.id, to: to.id, points: [{ ...from.position }, { ...to.position }] }]
      : [];
  });
  return { objects, links };
};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** A 2D scene camera as camera-track values (the canvas stage's `x`, `y`, `zoom`), and back. */
export const camera2DValues = (camera: Scene.Camera2D): Record<string, unknown> => ({
  x: camera.center.x,
  y: camera.center.y,
  zoom: camera.zoom,
});

export const camera2DOf = (base: Scene.Camera2D, values: Record<string, unknown> | undefined): Scene.Camera2D => ({
  center: { x: numberOr(values?.x, base.center.x), y: numberOr(values?.y, base.center.y) },
  zoom: numberOr(values?.zoom, base.zoom),
});

/** A 3D scene camera as camera-track values, and back; the projection is not keyed. */
export const camera3DValues = (camera: Scene.Camera3D): Record<string, unknown> => ({
  target: { ...camera.target },
  yaw: camera.yaw,
  pitch: camera.pitch,
  distance: camera.distance,
  fov: camera.fov,
});

export const camera3DOf = (base: Scene.Camera3D, values: Record<string, unknown> | undefined): Scene.Camera3D => {
  const target = values?.target;
  return {
    ...base,
    target:
      typeof target === 'object' && target !== null && 'x' in target && 'y' in target && 'z' in target
        ? {
            x: numberOr(target.x, base.target.x),
            y: numberOr(target.y, base.target.y),
            z: numberOr(target.z, base.target.z),
          }
        : base.target,
    yaw: numberOr(values?.yaw, base.yaw),
    pitch: numberOr(values?.pitch, base.pitch),
    distance: numberOr(values?.distance, base.distance),
    fov: numberOr(values?.fov, base.fov),
  };
};
