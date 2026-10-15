//
// Copyright 2026 DXOS.org
//

import { type Graph, NODE_RADIUS, type Vec2 } from '../model/index.ts';
import { matchSelector } from '../path.ts';
import { type CameraSpec, type Ease } from '../script/index.ts';
import { lerp } from '../util.ts';
import { type CameraPose } from './types.ts';

const FOCUS_MARGIN = 1.6;
const FIT_MARGIN = 1.1;

type Circle = { center: Vec2; radius: number };

export const ease = (kind: Ease, k: number): number => {
  switch (kind) {
    case 'linear':
      return k;
    case 'in':
      return k * k * k;
    case 'out':
      return 1 - (1 - k) ** 3;
    case 'in-out':
      return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  }
};

/** Extent interpolates geometrically so zooming feels even. */
export const interpolatePose = (from: CameraPose, to: CameraPose, k: number): CameraPose => ({
  center: [lerp(from.center[0], to.center[0], k), lerp(from.center[1], to.center[1], k)],
  extent: Math.exp(lerp(Math.log(from.extent), Math.log(to.extent), k)),
  tilt: lerp(from.tilt, to.tilt, k),
  spin: lerp(from.spin, to.spin, k),
});

export const circlesOf = (graph: Graph, selector: string): Circle[] => {
  const match = matchSelector(selector);
  return [
    ...Object.values(graph.networks)
      .filter((network) => match(network.path))
      .map((network) => ({ center: network.center, radius: network.radius })),
    ...Object.values(graph.nodes)
      .filter((node) => match(node.path))
      .map((node) => ({ center: node.position, radius: NODE_RADIUS[node.type] })),
  ];
};

/** The smallest circle around the circles' bounding box that contains all of them. */
export const boundsOf = (circles: readonly Circle[]): Circle => {
  const xs = circles.flatMap(({ center, radius }) => [center[0] - radius, center[0] + radius]);
  const ys = circles.flatMap(({ center, radius }) => [center[1] - radius, center[1] + radius]);
  const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const radius = circles.reduce(
    (max, circle) =>
      Math.max(max, Math.hypot(circle.center[0] - center[0], circle.center[1] - center[1]) + circle.radius),
    0,
  );
  return { center, radius };
};

/** The pose a camera command aims at, starting from `from`; problems go to `report`. */
export const resolvePose = (
  graph: Graph,
  spec: CameraSpec,
  from: CameraPose,
  report: (message: string) => void,
): CameraPose => {
  let { center, extent } = from;
  const focus = spec.focus ?? spec.follow;
  if (focus !== undefined) {
    const circles = circlesOf(graph, focus);
    if (circles.length === 0) {
      report(`"${focus}" matches nothing`);
    } else {
      const bounds = boundsOf(circles);
      center = bounds.center;
      extent = bounds.radius * FOCUS_MARGIN;
    }
  }
  if (spec.fit !== undefined) {
    const circles = circlesOf(graph, spec.fit);
    if (circles.length === 0) {
      report(`"${spec.fit}" matches nothing`);
    } else {
      const bounds = boundsOf(circles);
      center = bounds.center;
      extent = bounds.radius * FIT_MARGIN;
    }
  }
  if (spec.zoom !== undefined) {
    extent /= spec.zoom;
  }
  const view = spec.view ?? { tilt: from.tilt, spin: from.spin };
  return { center, extent, tilt: view.tilt, spin: view.spin };
};
