//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Annotation } from '@dxos/echo';
import { trim } from '@dxos/util';

export const MANDELBROT_PROCESS_KEY = 'org.dxos.stories.compute.mandelbrot';

export const DEFAULT_SIZE = 160;
export const SIZES = [80, 160, 320] as const;

/** Delay between pushed frames, bounded so a client cannot turn the process into a hot loop. */
export const DEFAULT_INTERVAL = 1_000;
const MIN_INTERVAL = 100;

/** Frames a render runs to before the process finishes. */
export const DEFAULT_FRAME_COUNT = 100;
const MAX_INTERVAL = 60_000;

/** Most frames a process will owe at once, however many are requested. */
const MAX_CREDITS = 10;

/** A process that receives no request for this long exits, so an abandoned one stops costing anything. */
const IDLE_TIMEOUT = 30_000;

const ZOOM = 0.7;

/** View width of the whole set, where iterations start. */
const FULL_WIDTH = 3;

export const Point = Schema.Struct({
  x: Schema.Number.pipe(Schema.annotate({ title: 'Start X' })),
  y: Schema.Number.pipe(Schema.annotate({ title: 'Start Y' })),
});
export type Point = Schema.Schema.Type<typeof Point>;

/** A well-known region of the set: its center on the complex plane and a view width that frames it. */
export type StartingPoint = {
  readonly name: string;
  readonly real: number;
  readonly imaginary: number;
  readonly viewWidth: number;
};

/** Regions whose detail persists as the zoom deepens; a render without a start picks one at random. */
export const STARTING_POINTS: readonly StartingPoint[] = [
  { name: 'Elephant Valley', real: 0.275, imaginary: 0.0075, viewWidth: 0.05 },
  { name: 'Deep Seahorse Valley', real: -0.743643887, imaginary: 0.1318259042, viewWidth: 0.0015 },
  { name: 'Triple Spiral Valley', real: -0.0894, imaginary: 0.6543, viewWidth: 0.001 },
  { name: 'Mini-Mandelbrot', real: -1.7497, imaginary: 0, viewWidth: 0.0007 },
  { name: 'Misiurewicz Point', real: -0.10109636384562, imaginary: 0.95628651080914, viewWidth: 0.02 },
];

export const randomStartingPoint = (): StartingPoint =>
  STARTING_POINTS[Math.floor(Math.random() * STARTING_POINTS.length)];

/** The params a {@link StartingPoint} sets: its center and view width. */
export const startingPointParams = ({ real, imaginary, viewWidth }: StartingPoint): MandelbrotParams => ({
  center: { x: real, y: imaginary },
  width: viewWidth,
});

/** Form values seeded from a random {@link STARTING_POINTS} entry. */
export const randomFormValues = (): MandelbrotFormValues => {
  const start = randomStartingPoint();
  return {
    preset: start.name,
    size: DEFAULT_SIZE,
    interval: DEFAULT_INTERVAL,
    frameCount: DEFAULT_FRAME_COUNT,
    ...startingPointParams(start),
  };
};

/** Square resolution in pixels. */
export const Size = Schema.Literals(SIZES);

/** Preset, then resolution beside interval, frame count beside view width, and the start point's coordinates. */
const PARAMS_LAYOUT = trim`
  <grid cols="2">
    <field name="preset" span="2"/>
    <field name="size"/>
    <field name="interval"/>
    <field name="frameCount"/>
    <field name="width"/>
    <field name="center.x"/>
    <field name="center.y"/>
  </grid>
`;

/** What a client can choose about a render; the command panel's form edits exactly this. */
export const MandelbrotParams = Schema.Struct({
  size: Size.pipe(Schema.annotate({ title: 'Resolution' }), Schema.optional),
  center: Point.pipe(
    Schema.annotate({ title: 'Start', description: 'Zoom target; leave empty for a random one.' }),
    Schema.optional,
  ),
  width: Schema.Number.pipe(
    Schema.annotate({ title: 'View width', description: 'Width of the first frame on the complex plane.' }),
    Schema.optional,
  ),
  interval: Schema.Number.pipe(
    Schema.annotate({ title: 'Interval (ms)', description: 'Delay between frames.' }),
    Schema.optional,
  ),
  frameCount: Schema.Number.pipe(
    Schema.annotate({ title: 'Frames', description: 'Frames to render before the process finishes.' }),
    Schema.optional,
  ),
});

export type MandelbrotParams = Schema.Schema.Type<typeof MandelbrotParams>;

/**
 * The command panel's form: {@link MandelbrotParams} plus the {@link STARTING_POINTS} preset whose
 * center and view width it fills in. The preset never reaches the process.
 */
export const MandelbrotFormValues = Schema.Struct({
  preset: Schema.String.pipe(Schema.annotate({ title: 'Preset' }), Schema.optional),
  ...MandelbrotParams.fields,
}).pipe(Annotation.FormLayoutAnnotation.set({ default: PARAMS_LAYOUT }));

export type MandelbrotFormValues = Schema.Schema.Type<typeof MandelbrotFormValues>;

/**
 * Grants the process `frames` more frames to push, optionally with new {@link MandelbrotParams}; a
 * `center` or `width` restarts the zoom at frame 0.
 */
export const MandelbrotInput = Schema.Struct({
  frames: Schema.Number,
  ...MandelbrotParams.fields,
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

/** Smallest pixel pitch, relative to the center's magnitude, before doubles stop resolving the view. */
const PRECISION_LIMIT = 1e-12;

type RenderedFrame = {
  output: MandelbrotOutput;
  /** Where the next frame zooms: the slowest-escaping pixel near the middle, so the zoom stays on the boundary. */
  next: Point;
  /** The view is now finer than doubles resolve; a deeper frame would only repeat pixels. */
  exhausted: boolean;
};

const computeFrame = (frame: number, size: number, center: Point, width: number): RenderedFrame => {
  const viewWidth = width * Math.pow(ZOOM, frame);
  const scale = viewWidth / size;
  // Deeper views need more iterations to resolve the boundary, wherever the zoom started.
  const depth = Math.log(FULL_WIDTH / viewWidth) / Math.log(1 / ZOOM);
  const maxIterations = Math.round(64 + Math.max(0, depth) * 24);

  const counts = new Uint32Array(size * size);
  let min = Infinity;
  let max = 0;
  let next = center;
  let nextCount = -1;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const x = center.x + (column - size / 2) * scale;
      const y = center.y + (row - size / 2) * scale;
      const count = escapeIterations(x, y, maxIterations);
      counts[row * size + column] = count;
      if (count < maxIterations) {
        min = Math.min(min, count);
        max = Math.max(max, count);
        // Only the middle half is a candidate, so the view drifts rather than jumps.
        const central = Math.abs(column - size / 2) < size / 4 && Math.abs(row - size / 2) < size / 4;
        if (central && count > nextCount) {
          nextCount = count;
          next = { x, y };
        }
      }
    }
  }

  // Stretched over this frame's own escape range (log scale), so contrast survives however deep the zoom.
  const range = Math.log(max + 1) - Math.log(min + 1);
  const bytes = new Uint8Array(size * size);
  counts.forEach((count, index) => {
    bytes[index] =
      count >= maxIterations
        ? 0
        : range > 0
          ? 1 + Math.floor((254 * (Math.log(count + 1) - Math.log(min + 1))) / range)
          : 128;
  });

  const magnitude = Math.max(1, Math.abs(center.x), Math.abs(center.y));
  return {
    output: { frame, size, data: toBase64(bytes) },
    next,
    exhausted: scale < magnitude * PRECISION_LIMIT,
  };
};

/**
 * Renders a Mandelbrot zoom on credit: each input grants `frames` more frames, which the process pushes
 * one per `interval` and then waits. It never computes more than it was granted (capped at
 * {@link MAX_CREDITS}), and finishes after `frameCount` frames (or once the zoom outruns double precision), or once no request has arrived for {@link IDLE_TIMEOUT}.
 */
export const MandelbrotProcess = Operation.makeDurable(
  { key: MANDELBROT_PROCESS_KEY, input: MandelbrotInput, output: MandelbrotOutput, services: [] },
  (ctx) =>
    Effect.sync(() => {
      let frame = 0;
      let credits = 0;
      let size: number = DEFAULT_SIZE;
      const start = randomStartingPoint();
      let center: Point = { x: start.real, y: start.imaginary };
      let width = start.viewWidth;
      let interval = DEFAULT_INTERVAL;
      let frameCount = DEFAULT_FRAME_COUNT;
      let lastRequest = Date.now();
      let rendering = false;

      // One alarm serves both roles: the next frame while credits remain, otherwise the idle check. It is
      // first armed by a request, not at spawn: a pending alarm keeps the process from settling, and a
      // host that waits for a spawned process to settle would wait out the whole idle timeout.
      const schedule = () => {
        rendering = credits > 0;
        return ctx.setAlarm(rendering ? interval : IDLE_TIMEOUT);
      };

      return {
        onInput: (input) =>
          Effect.gen(function* () {
            lastRequest = Date.now();
            credits = Math.min(MAX_CREDITS, credits + Math.max(0, input.frames));
            if (input.size !== undefined) {
              size = input.size;
            }
            if (input.center !== undefined) {
              center = input.center;
              frame = 0;
            }
            if (input.interval !== undefined) {
              interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, input.interval));
            }
            if (input.frameCount !== undefined) {
              frameCount = Math.max(1, Math.floor(input.frameCount));
            }
            if (input.width !== undefined) {
              width = input.width;
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
              const { output, next, exhausted } = computeFrame(frame++, size, center, width);
              ctx.submitOutput(output);
              center = next;
              if (frame >= frameCount || exhausted) {
                ctx.succeed();
                return;
              }
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
