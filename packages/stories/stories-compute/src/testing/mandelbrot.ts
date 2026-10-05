//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';

export const MANDELBROT_PROCESS_KEY = 'org.dxos.stories.compute.mandelbrot';

export const DEFAULT_SIZE = 160;
export const SIZES = [80, 160, 320] as const;

/** Delay between pushed frames. */
const FRAME_INTERVAL = 1_000;

/** Most frames a process will owe at once, however many are requested. */
const MAX_CREDITS = 10;

/** A process that receives no request for this long exits, so an abandoned one stops costing anything. */
const IDLE_TIMEOUT = 30_000;

const ZOOM = 0.7;

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Point = Schema.Schema.Type<typeof Point>;

/** Boundary points whose detail persists at every zoom depth; a process without a start picks one at random. */
export const POINTS: readonly { name: string; point: Point }[] = [
  { name: 'Seahorse valley', point: { x: -0.743643887037151, y: 0.13182590420533 } },
  { name: 'Elephant valley', point: { x: 0.2850000000000001, y: 0.0100000000000001 } },
  { name: 'Triple spiral', point: { x: -0.088, y: 0.654 } },
  { name: 'Mini Mandelbrot', point: { x: -1.7686, y: 0.0017 } },
  { name: 'Dendrite', point: { x: -0.1011, y: 0.9563 } },
];

/**
 * Grants the process `frames` more frames to push, optionally at a new square resolution. A `center`
 * restarts the zoom at frame 0 on that point.
 */
export const MandelbrotInput = Schema.Struct({
  frames: Schema.Number,
  size: Schema.optional(Schema.Number),
  center: Schema.optional(Point),
});

export type MandelbrotInput = Schema.Schema.Type<typeof MandelbrotInput>;

export const MandelbrotOutput = Schema.Struct({
  /** Zoom depth of the frame. */
  frame: Schema.Number,
  /** Width and height in pixels. */
  size: Schema.Number,
  /**
   * Base64 of one byte per pixel, row-major, `size` x `size`: 0 for points inside the set, otherwise
   * 1-255 by escape speed. Bytes rather than a number array keep a frame small enough to poll from EDGE.
   */
  data: Schema.String,
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

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/** Decodes {@link MandelbrotOutput.data} to one intensity byte per pixel. */
export const decodeFrame = (data: string): Uint8Array => Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

const computeFrame = (frame: number, size: number, center: Point): MandelbrotOutput => {
  const scale = (3 / size) * Math.pow(ZOOM, frame);
  // Deeper frames need more iterations to resolve the boundary.
  const maxIterations = Math.round(64 + frame * 24);
  const bytes = new Uint8Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const iterations = escapeIterations(
        center.x + (column - size / 2) * scale,
        center.y + (row - size / 2) * scale,
        maxIterations,
      );
      bytes[row * size + column] =
        iterations >= maxIterations ? 0 : 1 + Math.floor(254 * Math.sqrt(iterations / maxIterations));
    }
  }
  return { frame, size, data: toBase64(bytes) };
};

const clampSize = (size: number): number => Math.min(SIZES[SIZES.length - 1], Math.max(SIZES[0], Math.round(size)));

/**
 * Renders a Mandelbrot zoom on credit: each input grants `frames` more frames, which the process pushes
 * one per {@link FRAME_INTERVAL} and then waits. It never computes more than it was granted (capped at
 * {@link MAX_CREDITS}), and exits once no request has arrived for {@link IDLE_TIMEOUT}.
 */
export const MandelbrotProcess = Operation.makeDurable(
  { key: MANDELBROT_PROCESS_KEY, input: MandelbrotInput, output: MandelbrotOutput, services: [] },
  (ctx) =>
    Effect.sync(() => {
      let frame = 0;
      let credits = 0;
      let size = DEFAULT_SIZE;
      let center = POINTS[Math.floor(Math.random() * POINTS.length)].point;
      let lastRequest = Date.now();
      let rendering = false;

      // One alarm serves both roles: the next frame while credits remain, otherwise the idle check.
      const schedule = () => {
        rendering = credits > 0;
        return ctx.setAlarm(rendering ? FRAME_INTERVAL : IDLE_TIMEOUT);
      };

      return {
        onSpawn: () => ctx.setAlarm(IDLE_TIMEOUT),
        onInput: (input) =>
          Effect.gen(function* () {
            lastRequest = Date.now();
            credits = Math.min(MAX_CREDITS, credits + Math.max(0, input.frames));
            if (input.size !== undefined) {
              size = clampSize(input.size);
            }
            if (input.center !== undefined) {
              center = input.center;
              frame = 0;
            }
            if (!rendering && credits > 0) {
              rendering = true;
              yield* ctx.setAlarm(0);
            }
          }),
        onAlarm: () =>
          Effect.gen(function* () {
            if (credits > 0) {
              credits--;
              ctx.submitOutput(computeFrame(frame++, size, center));
              yield* schedule();
              return;
            }
            const idle = Date.now() - lastRequest;
            if (idle >= IDLE_TIMEOUT) {
              ctx.succeed();
              return;
            }
            yield* ctx.setAlarm(IDLE_TIMEOUT - idle);
          }),
      };
    }),
);
