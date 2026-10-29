//
// Copyright 2026 DXOS.org
//

import { type ArrangeInput, type Arranger, type Vec3 } from '@dxos/animation';

import { type Element3D, type SceneRecord2D, type SceneRecord3D } from './Scene.ts';

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

const isVec3 = (value: unknown): value is Vec3 =>
  typeof value === 'object' &&
  value !== null &&
  'x' in value &&
  'y' in value &&
  'z' in value &&
  typeof value.x === 'number' &&
  typeof value.y === 'number' &&
  typeof value.z === 'number';

const numberParam = (params: ArrangeInput['params'], name: string, fallback: number): number => {
  const value = params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const centreOf = (input: ArrangeInput): Vec3 => {
  const centre = input.params.centre;
  if (typeof centre === 'string') {
    const position = input.values(centre).position;
    return isVec3(position) ? position : ORIGIN;
  }
  return isVec3(centre) ? centre : ORIGIN;
};

/** Targets evenly on a circle (`radius`, default 3) in the ground plane about `centre`, from angle `start` (radians). */
export const ring: Arranger = (input) => {
  const centre = centreOf(input);
  const radius = numberParam(input.params, 'radius', 3);
  const start = numberParam(input.params, 'start', 0);
  return Object.fromEntries(
    input.targets.map((target, index) => {
      const angle = start + (index / input.targets.length) * Math.PI * 2;
      return [target, { x: centre.x + Math.cos(angle) * radius, y: centre.y, z: centre.z + Math.sin(angle) * radius }];
    }),
  );
};

/** Targets in rows of `columns` (default the square root, rounded up), `spacing` (default 2) apart, about `centre`. */
export const grid: Arranger = (input) => {
  const count = input.targets.length;
  const columns = Math.max(1, Math.round(numberParam(input.params, 'columns', Math.ceil(Math.sqrt(count)))));
  const rows = Math.ceil(count / columns);
  const spacing = numberParam(input.params, 'spacing', 2);
  const centre = centreOf(input);
  return Object.fromEntries(
    input.targets.map((target, index) => [
      target,
      {
        x: centre.x + ((index % columns) - (columns - 1) / 2) * spacing,
        y: centre.y,
        z: centre.z + (Math.floor(index / columns) - (rows - 1) / 2) * spacing,
      },
    ]),
  );
};

export const LAYOUTS_3D: Readonly<Record<string, Arranger>> = { ring, grid };

/**
 * Runs each group's stored arrangement over its members that are neither pinned nor already placed, so text written
 * as intent alone gets positions while a placed or hand-moved member stays put.
 */
export const applyLayout = (scene: SceneRecord3D): SceneRecord3D => {
  const elements: Record<string, Element3D> = { ...scene.elements };
  for (const group of Object.values(scene.elements)) {
    const arranger = group.layout && LAYOUTS_3D[group.layout.kind];
    if (!arranger || !group.members) {
      continue;
    }
    const targets = group.members.filter((id) => {
      const member = elements[id];
      return member !== undefined && !member.pinned && member.position === undefined;
    });
    const placed = arranger({
      targets,
      params: { centre: group.position ?? ORIGIN, ...group.layout?.params },
      values: (id) => ({ position: elements[id]?.position }),
    });
    for (const [id, position] of Object.entries(placed)) {
      const member = elements[id];
      if (member && isVec3(position)) {
        elements[id] = { ...member, position };
      }
    }
  }
  return { ...scene, elements };
};

/** An element's radius: half its largest scale, scale being its size in scene units. */
export const radiusOf = (element: Element3D): number => {
  const scale = element.scale ?? { x: 1, y: 1, z: 1 };
  return Math.max(scale.x, scale.y, scale.z) / 2;
};

/** The box round every placed element; zero-sized when none is placed. */
export const bounds2D = (scene: SceneRecord2D): { x: number; y: number; width: number; height: number } => {
  const boxes = Object.values(scene.elements).flatMap((element) =>
    element.center && element.size ? [{ center: element.center, size: element.size }] : [],
  );
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const left = Math.min(...boxes.map(({ center, size }) => center.x - size.width / 2));
  const top = Math.min(...boxes.map(({ center, size }) => center.y - size.height / 2));
  const right = Math.max(...boxes.map(({ center, size }) => center.x + size.width / 2));
  const bottom = Math.max(...boxes.map(({ center, size }) => center.y + size.height / 2));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

/** A sphere round every placed element, centred on their box; zero when none is placed. */
export const bounds3D = (scene: SceneRecord3D): { center: Vec3; radius: number } => {
  const placed = Object.values(scene.elements).flatMap((element) =>
    element.position ? [{ position: element.position, radius: radiusOf(element) }] : [],
  );
  if (placed.length === 0) {
    return { center: ORIGIN, radius: 0 };
  }
  const axis = (key: keyof Vec3) => {
    const low = Math.min(...placed.map(({ position, radius }) => position[key] - radius));
    const high = Math.max(...placed.map(({ position, radius }) => position[key] + radius));
    return (low + high) / 2;
  };
  const center = { x: axis('x'), y: axis('y'), z: axis('z') };
  const radius = Math.max(
    ...placed.map(
      ({ position, radius }) =>
        Math.hypot(position.x - center.x, position.y - center.y, position.z - center.z) + radius,
    ),
  );
  return { center, radius };
};

/** A child scene's share of its frame (design D-23): scaled to 80% of the frame and centred in it. */
export const FIT_MARGIN = 0.8;

/** How a child scene is placed inside its frame: `world = offset + local * scale`. */
export const fitChild = (
  frame: { center: Vec3; radius: number },
  child: { center: Vec3; radius: number },
): { offset: Vec3; scale: number } => {
  const scale = child.radius > 0 ? (frame.radius * FIT_MARGIN) / child.radius : 1;
  return {
    scale,
    offset: {
      x: frame.center.x - child.center.x * scale,
      y: frame.center.y - child.center.y * scale,
      z: frame.center.z - child.center.z * scale,
    },
  };
};
