//
// Copyright 2026 DXOS.org
//

//
// A headless run of a generator (ANIMATION.md §6.6, `canvas.inspectGenerator`): what an agent reads instead of watching
// the motion. It compiles the source, runs the generator over a span, reports step timings, checks that the same times
// give the same shapes when reached in a different order (from different checkpoints), and draws a contact sheet.
//

import { type EffectStatus, type ModuleCompiler, STEP_BUDGET_MS, hashSeed } from '@dxos/animation';
import { type Bounds, type NodeId } from '@dxos/scene';

import { type View } from '../model/index.ts';
import { nodeBounds, unionBounds } from '../utils/index.ts';
import { loadGenerator } from './compile.ts';
import { GeneratorRunner } from './runner.ts';
import { type Shape } from './types.ts';

export type CheckOptions = {
  compile: ModuleCompiler;
  source: string;
  /** The parameter schema, for bindings. */
  schema?: Record<string, unknown>;
  /** The scene holding the generator node. */
  scene: View;
  node: NodeId;
  /** The times to draw, in seconds. */
  times: readonly number[];
  budgetMs?: number;
  /** Milliseconds for timing steps; `performance.now` where there is one. */
  now?: () => number;
};

export type CheckFrame = { t: number; shapes: number };

export type CheckReport = {
  /** Compile or load errors; nothing else is reported when there are any. */
  errors?: string[];
  status?: EffectStatus;
  timing?: { meanMs: number; budgetMs: number };
  /** Whether every time gave the same shapes run forward and run backward (restoring from checkpoints). */
  deterministic?: boolean;
  /** The first time the two runs differed at, when they did. */
  mismatch?: number;
  frames?: CheckFrame[];
  /** An SVG of the frames side by side, each labelled with its time. */
  sheet?: string;
};

export const checkGenerator = async ({
  compile,
  source,
  schema,
  scene,
  node,
  times,
  budgetMs = STEP_BUDGET_MS,
  now = typeof performance === 'undefined' ? () => 0 : () => performance.now(),
}: CheckOptions): Promise<CheckReport> => {
  const compiled = await compile(source);
  if (compiled.errors) {
    return { errors: compiled.errors };
  }
  let module;
  try {
    module = loadGenerator(compiled.code);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
  const element = scene.nodes[node];
  if (!element) {
    return { errors: [`The scene has no node ${node}.`] };
  }
  const seed = typeof Reflect.get(element, 'seed') === 'number' ? Number(Reflect.get(element, 'seed')) : hashSeed(node);
  const input = { scene, node, schema };
  const sorted = [...times].sort((left, right) => left - right);

  const forward = new GeneratorRunner(module, { seed, budgetMs, now });
  const ahead = sorted.map((t) => ({ t, frame: forward.frame(t, input) }));
  // Backwards, on a fresh run: each time is reached from a different checkpoint than going forward.
  const backward = new GeneratorRunner(module, { seed, budgetMs });
  const behind = new Map([...sorted].reverse().map((t) => [t, JSON.stringify(backward.frame(t, input).shapes)]));
  const mismatch = ahead.find(({ t, frame }) => behind.get(t) !== JSON.stringify(frame.shapes))?.t;
  const last = ahead[ahead.length - 1]?.frame;

  return {
    status: last?.status ?? forward.status,
    timing: { meanMs: last?.stepMs ?? 0, budgetMs },
    deterministic: mismatch === undefined,
    ...(mismatch !== undefined ? { mismatch } : {}),
    frames: ahead.map(({ t, frame }) => ({ t, shapes: frame.shapes.length })),
    sheet: contactSheet(
      ahead.map(({ t, frame }) => ({ t, shapes: frame.shapes })),
      nodeBounds(element),
    ),
  };
};

/** The box a shape covers, roughly: enough to frame a contact sheet. */
const shapeBounds = (shape: Shape): Bounds | undefined => {
  switch (shape.kind) {
    case 'circle':
      return {
        x: shape.center.x - shape.radius,
        y: shape.center.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case 'rect':
      return shape.bounds;
    default:
      return undefined;
  }
};

const CELL_WIDTH = 240;
const COLUMNS = 4;

/** The frames as an SVG contact sheet: one cell per time on a dark ground, shapes in white unless coloured. */
export const contactSheet = (frames: ReadonlyArray<{ t: number; shapes: Shape[] }>, frame: Bounds): string => {
  const all = frames.flatMap(({ shapes }) => shapes.flatMap((shape) => shapeBounds(shape) ?? []));
  const view = unionBounds([frame, ...all]) ?? frame;
  const cellHeight = Math.round((CELL_WIDTH * view.height) / Math.max(1, view.width));
  const rows = Math.ceil(frames.length / COLUMNS);
  const width = CELL_WIDTH * Math.min(COLUMNS, frames.length);
  const height = (cellHeight + 20) * rows;
  const fill = (shape: { color?: string; opacity?: number }) =>
    `fill="${shape.color ?? 'white'}" fill-opacity="${shape.opacity ?? 1}"`;
  const cells = frames.map(({ t, shapes }, index) => {
    const x = (index % COLUMNS) * CELL_WIDTH;
    const y = Math.floor(index / COLUMNS) * (cellHeight + 20);
    const body = shapes
      .map((shape) => {
        switch (shape.kind) {
          case 'circle':
            return `<circle cx="${shape.center.x}" cy="${shape.center.y}" r="${shape.radius}" ${fill(shape)}/>`;
          case 'rect':
            return `<rect x="${shape.bounds.x}" y="${shape.bounds.y}" width="${shape.bounds.width}" height="${shape.bounds.height}" rx="${shape.radius ?? 0}" ${fill(shape)}/>`;
          case 'path':
            return `<path d="${shape.d}" fill="none" stroke="${shape.color ?? 'white'}" stroke-width="${shape.width ?? 1}" stroke-opacity="${shape.opacity ?? 1}" pathLength="1" stroke-dasharray="${shape.reveal ?? 1} 1"/>`;
          case 'instance':
            return `<circle cx="${shape.center.x}" cy="${shape.center.y}" r="4" fill="none" stroke="white"/>`;
        }
      })
      .join('');
    return `<g transform="translate(${x} ${y})"><rect width="${CELL_WIDTH}" height="${cellHeight}" fill="#050505" stroke="#333"/><svg width="${CELL_WIDTH}" height="${cellHeight}" viewBox="${view.x} ${view.y} ${view.width} ${view.height}">${body}</svg><text x="6" y="${cellHeight + 14}" font-family="monospace" font-size="12" fill="#999">t = ${t.toFixed(2)} s, ${shapes.length} shapes</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#111"/>${cells.join('')}</svg>`;
};
