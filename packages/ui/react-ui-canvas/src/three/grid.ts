//
// Copyright 2026 DXOS.org
//

/** Minor lines per major (unit) cell, as react-ui-canvas's `MAJOR_GRID_RATIO`. */
export const GRID_MAJOR_EVERY = 4;

/** The minor grid's spacing in scene units: a unit, a new object's size, is the major cell. */
export const GRID_MINOR = 1 / GRID_MAJOR_EVERY;

/** Alpha at the grid's centre: the minor lines barely there, the major ones a little stronger. */
const MINOR_ALPHA = 0.12;
const MAJOR_ALPHA = 0.3;

/** One line of the ground grid: along `axis`, at `offset` on the other axis, with its alpha after fading. */
export type GridLine = { axis: 'x' | 'z'; offset: number; major: boolean; alpha: number };

export type GroundGridOptions = { extent: number; majorEvery: number };

/**
 * The ground grid's lines on the y = 0 plane from -extent to extent: a major line on each unit and `majorEvery` - 1
 * minor ones between, each fading with its distance from the centre so the grid has no hard edge.
 */
export const groundGrid = ({ extent, majorEvery }: GroundGridOptions): { lines: GridLine[] } => ({
  lines: (['x', 'z'] as const).flatMap((axis) =>
    Array.from({ length: 2 * extent * majorEvery + 1 }, (_, index) => {
      const step = index - extent * majorEvery;
      const offset = step / majorEvery;
      const major = step % majorEvery === 0;
      const fade = 1 - (0.8 * Math.abs(offset)) / extent;
      return { axis, offset, major, alpha: (major ? MAJOR_ALPHA : MINOR_ALPHA) * fade };
    }),
  ),
});

/** The axes' colours, by the usual convention: x red, y green, z blue. */
export const AXIS_COLORS = { x: '#e5484d', y: '#30a46c', z: '#3e63dd' } as const;

/** Lifts the ground axes off the y = 0 plane, where the grid's centre lines would z-fight with them. */
const AXIS_LIFT = 0.002;

export type AxisLine = {
  axis: 'x' | 'y' | 'z';
  color: string;
  from: [number, number, number];
  to: [number, number, number];
};

/** The x and z axes across the ground grid, and the y axis rising from its centre to the same height. */
export const groundAxes = (extent: number): AxisLine[] => [
  { axis: 'x', color: AXIS_COLORS.x, from: [-extent, AXIS_LIFT, 0], to: [extent, AXIS_LIFT, 0] },
  { axis: 'y', color: AXIS_COLORS.y, from: [0, 0, 0], to: [0, extent, 0] },
  { axis: 'z', color: AXIS_COLORS.z, from: [0, AXIS_LIFT, -extent], to: [0, AXIS_LIFT, extent] },
];
