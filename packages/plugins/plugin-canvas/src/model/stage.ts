//
// Copyright 2026 DXOS.org
//

import { type Arranger, getPath } from '@dxos/animation';
import { type Point } from '@dxos/scene';

/** The element path a script's layout places: an element's centre. */
const POSITION_PATH = 'center';

const pointOf = (value: unknown): Point | undefined => {
  const x = getPath(value, 'x');
  const y = getPath(value, 'y');
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
};

/** The centre of the targets' resting positions. */
const centroid = (targets: readonly string[], values: (target: string) => Readonly<Record<string, unknown>>) => {
  const points = targets.flatMap((target) => pointOf(values(target)[POSITION_PATH]) ?? []);
  return points.length === 0
    ? { x: 0, y: 0 }
    : {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };
};

const numberParam = (params: Readonly<Record<string, unknown>>, name: string, fallback: number): number => {
  const value = params[name];
  return typeof value === 'number' ? value : fallback;
};

/** Targets in a row through their centre, `spacing` (default 200) apart, in the order named. */
const row: Arranger = ({ targets, params, values }) => {
  const centre = centroid(targets, values);
  const spacing = numberParam(params, 'spacing', 200);
  const start = centre.x - ((targets.length - 1) * spacing) / 2;
  return Object.fromEntries(targets.map((target, index) => [target, { x: start + index * spacing, y: centre.y }]));
};

/** Targets evenly on a circle (`radius`, default 200) about their centre, the first at the top. */
const ring: Arranger = ({ targets, params, values }) => {
  const centre = centroid(targets, values);
  const radius = numberParam(params, 'radius', 200);
  return Object.fromEntries(
    targets.map((target, index) => {
      const angle = (index / targets.length) * Math.PI * 2 - Math.PI / 2;
      return [target, { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius }];
    }),
  );
};

/** The layouts a 2D canvas shot's script may name. */
export const CANVAS_LAYOUTS: Readonly<Record<string, Arranger>> = { row, ring };
