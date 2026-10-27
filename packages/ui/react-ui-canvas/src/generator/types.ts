//
// Copyright 2026 DXOS.org
//

//
// The generator contract (ANIMATION.md §6.1): what an agent-written module exports and what the canvas gives it. A
// generator never touches the DOM; it returns `Shape` lists, plain data the generator layer draws.
//

import { type Bounds, type Node, type Point, type View } from '../model/index.ts';

/** What a generator draws, in scene coordinates. A hue is a theme hue; `color` a CSS colour, which wins over it. */
export type Shape =
  | { kind: 'circle'; center: Point; radius: number; hue?: string; color?: string; opacity?: number }
  | { kind: 'rect'; bounds: Bounds; radius?: number; hue?: string; color?: string; opacity?: number }
  | {
      kind: 'path';
      d: string;
      stroke?: string;
      hue?: string;
      color?: string;
      width?: number;
      opacity?: number;
      /** How much of the path is drawn, 0 to 1 from its start: a stroke being revealed. */
      reveal?: number;
    }
  | { kind: 'instance'; composite: string; center: Point; scale?: number; opacity?: number };

/** A bound node, resolved from the scene sampled at the step's time. */
export type BoundNode = {
  id: string;
  center: Point;
  size: { width: number; height: number };
  bounds: Bounds;
  node: Node;
};

/** A bound link: its route as path data and as a polyline. */
export type BoundLink = { id: string; path: string; points: readonly Point[] };

export type GeneratorContext<P = Record<string, unknown>> = {
  /** Seconds into the timeline of this step (or sample). */
  t: number;
  /** The fixed step, in seconds; 0 for a stateless sample. */
  dt: number;
  /** The node's parameters at `t`, keyed values applied. */
  params: P;
  /** Seeded per node and run: the only source of randomness a generator may use. */
  random: () => number;
  /** The scene sampled at `t`. */
  scene: View;
  /** The generator node's own frame. */
  bounds: Bounds;
  /** Parameters marked as bindings (`x-binding` in the schema), resolved: node or link ids become their geometry. */
  bound: Record<string, ReadonlyArray<BoundNode | BoundLink>>;
};

/** Content that is a function of time alone: sampled anywhere, in any order. */
export type StatelessGenerator<P = Record<string, unknown>> = {
  sample: (ctx: GeneratorContext<P>) => Shape[];
};

/** Content with memory, stepped forward at a fixed rate from `init`; `draw` turns a state into shapes. */
export type StatefulGenerator<P = Record<string, unknown>, S = unknown> = {
  /** Seconds stepped before t = 0, so the content is already under way when the timeline starts. */
  warmup?: number;
  init: (ctx: GeneratorContext<P>) => S;
  step: (state: S, ctx: GeneratorContext<P>) => S;
  draw: (state: S, ctx: GeneratorContext<P>) => Shape[];
};

export type GeneratorModule<P = Record<string, unknown>, S = unknown> = StatelessGenerator<P> | StatefulGenerator<P, S>;

export const isStateful = (module: GeneratorModule): module is StatefulGenerator =>
  'init' in module && 'step' in module && 'draw' in module;

/** The source of a generator as the canvas loads it: the host resolves a node's `generator` reference to this. */
export type GeneratorSource = {
  name: string;
  /** One TypeScript module whose default export is a generator. */
  source: string;
  /** JSON schema of the parameters; a property with `x-binding: 'node' | 'link'` holds ids the runtime resolves. */
  params?: Record<string, unknown>;
  /** Bumped on every revision; compiled code and checkpoints key on it. */
  version: number;
};

/** How a generator run stands: running, or paused by an error or by going over its time budget. */
export type GeneratorStatus = { state: 'running' } | { state: 'paused'; reason: 'error' | 'budget'; message: string };

/** One generator's output for one time. */
export type GeneratorFrame = {
  shapes: Shape[];
  status: GeneratorStatus;
  /** Mean milliseconds per step (or sample) over the recent window. */
  stepMs: number;
};

/** The module specifier a generator imports the motion library and math kit from; the only import it may make. */
export const MOTION_MODULE = '@dxos/react-ui-canvas/motion';
