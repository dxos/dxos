//
// Copyright 2026 DXOS.org
//

/** Major lines every this many minor (unit) lines, as react-ui-canvas's `MAJOR_GRID_RATIO`. */
export const GRID_MAJOR_EVERY = 4;

/** Alpha at the grid's centre: the minor lines barely there, the major ones a little stronger. */
const MINOR_ALPHA = 0.12;
const MAJOR_ALPHA = 0.3;

/** One line of the ground grid: along `axis`, at `offset` on the other axis, with its alpha after fading. */
export type GridLine = { axis: 'x' | 'z'; offset: number; major: boolean; alpha: number };

export type GroundGridOptions = { extent: number; majorEvery: number };

/**
 * The ground grid's lines on the y = 0 plane, one unit apart from -extent to extent: every `majorEvery`-th is major, and
 * each fades with its distance from the centre so the grid has no hard edge.
 */
export const groundGrid = ({ extent, majorEvery }: GroundGridOptions): { lines: GridLine[] } => ({
  lines: (['x', 'z'] as const).flatMap((axis) =>
    Array.from({ length: 2 * extent + 1 }, (_, index) => {
      const offset = index - extent;
      const major = offset % majorEvery === 0;
      const fade = 1 - (0.8 * Math.abs(offset)) / extent;
      return { axis, offset, major, alpha: (major ? MAJOR_ALPHA : MINOR_ALPHA) * fade };
    }),
  ),
});
