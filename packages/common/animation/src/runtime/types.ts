//
// Copyright 2026 DXOS.org
//

//
// The effect contract (plugin-animator DESIGN.md §6): what an agent-written module exports. The context it receives
// (`C`) and the items it returns (`O`) belong to the renderer that hosts it; the runtime only steps it.
//

/** Content that is a function of time alone: sampled anywhere, in any order. */
export type StatelessEffect<C, O> = {
  sample: (ctx: C) => O[];
};

/** Content with memory, stepped forward at a fixed rate from `init`; `draw` turns a state into output. */
export type StatefulEffect<C, O, S = unknown> = {
  /** Seconds stepped before t = 0, so the content is already under way when the timeline starts. */
  warmup?: number;
  init: (ctx: C) => S;
  step: (state: S, ctx: C) => S;
  draw: (state: S, ctx: C) => O[];
};

export type EffectModule<C, O, S = unknown> = StatelessEffect<C, O> | StatefulEffect<C, O, S>;

export const isStateful = <C, O, S>(module: EffectModule<C, O, S>): module is StatefulEffect<C, O, S> =>
  'init' in module && 'step' in module && 'draw' in module;

/** How an effect run stands: running, or paused by an error or by going over its time budget. */
export type EffectStatus = { state: 'running' } | { state: 'paused'; reason: 'error' | 'budget'; message: string };

/** One effect's output for one time. */
export type EffectFrame<O> = {
  output: O[];
  status: EffectStatus;
  /** Mean milliseconds per step (or sample) over the recent window. */
  stepMs: number;
};

/** What the runtime knows of a step; a host builds the module's context from it. */
export type EffectStep = {
  /** Seconds into the timeline of this step (or sample). */
  t: number;
  /** The fixed step, in seconds; 0 for a stateless sample. */
  dt: number;
  /** Seeded per run: the only source of randomness an effect may use. */
  random: () => number;
};
