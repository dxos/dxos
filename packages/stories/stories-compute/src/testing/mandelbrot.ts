//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';

export const MANDELBROT_PROCESS_KEY = 'org.dxos.stories.compute.mandelbrot';

export const WIDTH = 160;
export const HEIGHT = 120;

/** Rows computed per alarm; small enough that each step yields the runtime quickly. */
const BAND = 8;

/** Delay between bands, so progress is visible and the runtime stays responsive. */
const STEP_INTERVAL = 50;

/** Seahorse valley: detail persists at every zoom depth. */
const CENTER = { x: -0.743643887037151, y: 0.13182590420533 };
const INITIAL_SCALE = 3 / WIDTH;
const ZOOM = 0.7;

export const MandelbrotOutput = Schema.Struct({
  /** Zoom frame the band belongs to. */
  frame: Schema.Number,
  /** First row of the band. */
  y: Schema.Number,
  maxIterations: Schema.Number,
  /** Escape iteration per pixel, row-major, `WIDTH` per row. */
  data: Schema.Array(Schema.Number),
});

export type MandelbrotOutput = Schema.Schema.Type<typeof MandelbrotOutput>;

const escapeIterations = (cx: number, cy: number, maxIterations: number): number => {
  let x = 0;
  let y = 0;
  let iteration = 0;
  while (x * x + y * y <= 4 && iteration < maxIterations) {
    const next = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = next;
    iteration++;
  }
  return iteration;
};

const computeBand = (frame: number, startRow: number): MandelbrotOutput => {
  const scale = INITIAL_SCALE * Math.pow(ZOOM, frame);
  // Deeper frames need more iterations to resolve the boundary.
  const maxIterations = Math.round(64 + frame * 24);
  const data: number[] = [];
  for (let row = startRow; row < Math.min(startRow + BAND, HEIGHT); row++) {
    for (let column = 0; column < WIDTH; column++) {
      data.push(
        escapeIterations(CENTER.x + (column - WIDTH / 2) * scale, CENTER.y + (row - HEIGHT / 2) * scale, maxIterations),
      );
    }
  }
  return { frame, y: startRow, maxIterations, data };
};

/**
 * Renders an endless Mandelbrot zoom one band per alarm, until it is terminated.
 * The alarm loop leaves the process HYBERNATING between bands rather than blocking its runtime.
 */
export const MandelbrotProcess = Operation.makeDurable(
  { key: MANDELBROT_PROCESS_KEY, input: Schema.Void, output: MandelbrotOutput, services: [] },
  (ctx) =>
    Effect.sync(() => {
      let frame = 0;
      let row = 0;
      return {
        onSpawn: () => ctx.setAlarm(STEP_INTERVAL),
        onAlarm: () =>
          Effect.gen(function* () {
            ctx.submitOutput(computeBand(frame, row));
            row += BAND;
            if (row >= HEIGHT) {
              row = 0;
              frame++;
            }
            yield* ctx.setAlarm(STEP_INTERVAL);
          }),
      };
    }),
);
