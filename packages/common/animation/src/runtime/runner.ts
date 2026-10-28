//
// Copyright 2026 DXOS.org
//

//
// The effect runtime's core (react-ui-canvas ANIMATION.md §6.2): one effect, sampled at any time. A stateful effect
// steps at a fixed rate with a seeded random from `init`, keeping a checkpoint every two seconds, so the same time
// always gives the same output however it was reached (playback, a scrub back, export). Pure of the DOM and of any
// renderer: the host supplies the context each step sees and the check that keeps only its own output items.
//

import { hashSeed, seeded } from './random.ts';
import {
  type EffectFrame,
  type EffectModule,
  type EffectStatus,
  type EffectStep,
  type StatefulEffect,
  type StatelessEffect,
  isStateful,
} from './types.ts';

/** Steps per second of a stateful effect, whatever the display's frame rate. */
export const STEP_RATE = 120;
/** Seconds between checkpoints. */
export const CHECKPOINT_INTERVAL = 2;
/** Milliseconds a step may take, on average over the recent window, before the effect is paused. */
export const STEP_BUDGET_MS = 4;
/** Steps the budget's average is taken over; fewer than half of it are never judged. */
const BUDGET_WINDOW = 60;

/** Times within this of a step boundary count as on it, so t = n / fps lands on a whole step. */
const STEP_EPSILON = 1e-6;

export type RunnerOptions = {
  seed: number;
  stepRate?: number;
  checkpointInterval?: number;
  budgetMs?: number;
  /** Milliseconds, for the budget only; never read to animate. */
  now?: () => number;
};

export type EffectRunnerOptions<O> = RunnerOptions & {
  /** Keeps only the items of the renderer's output type; anything else a module returns is dropped. */
  accept?: (value: unknown) => value is O;
};

/** Builds the context a module sees for one step from what the runtime knows of it. */
export type ContextBuilder<C> = (step: EffectStep) => C;

type Snapshot = { step: number; state: unknown; random: number };

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * One effect. `frame(t, context)` returns its output at time `t`; a stateful effect steps from the nearest earlier
 * checkpoint (or where it last was, if nearer), so scrubbing back costs at most two seconds of steps. An error or a
 * run over budget pauses it; `reset` (a revision, an edit to what it is bound to) starts it over.
 */
export class EffectRunner<C, O> {
  readonly #module: EffectModule<C, O>;
  readonly #seed: number;
  readonly #dt: number;
  readonly #checkpointSteps: number;
  readonly #budgetMs: number;
  readonly #now: () => number;
  readonly #accept: ((value: unknown) => value is O) | undefined;
  readonly #checkpoints = new Map<number, Snapshot>();
  #cursor: Snapshot | undefined;
  #status: EffectStatus = { state: 'running' };
  #timings: number[] = [];

  constructor(
    module: EffectModule<C, O>,
    {
      seed,
      stepRate = STEP_RATE,
      checkpointInterval = CHECKPOINT_INTERVAL,
      budgetMs = STEP_BUDGET_MS,
      now = () => 0,
      accept,
    }: EffectRunnerOptions<O>,
  ) {
    this.#module = module;
    this.#seed = seed;
    this.#dt = 1 / stepRate;
    this.#checkpointSteps = Math.max(1, Math.round(checkpointInterval * stepRate));
    this.#budgetMs = budgetMs;
    this.#now = now;
    this.#accept = accept;
  }

  get status(): EffectStatus {
    return this.#status;
  }

  /** How many checkpoints are held (for tests and checks). */
  get checkpoints(): number {
    return this.#checkpoints.size;
  }

  /** Forgets every state, checkpoint and pause, as after a revision or an edit to what it is bound to. */
  reset(): void {
    this.#checkpoints.clear();
    this.#cursor = undefined;
    this.#status = { state: 'running' };
    this.#timings = [];
  }

  /** The output at time `t`, each step's context built by `context`. */
  frame(t: number, context: ContextBuilder<C>): EffectFrame<O> {
    if (this.#status.state === 'paused') {
      return { output: [], status: this.#status, stepMs: this.#meanStep() };
    }
    try {
      const module = this.#module;
      const output = isStateful(module) ? this.#stateful(module, t, context) : this.#stateless(module, t, context);
      const accept = this.#accept;
      return {
        output: accept ? output.filter((item) => accept(item)) : output,
        status: this.#status,
        stepMs: this.#meanStep(),
      };
    } catch (error) {
      this.#status = { state: 'paused', reason: 'error', message: message(error) };
      return { output: [], status: this.#status, stepMs: this.#meanStep() };
    }
  }

  #stateless(module: StatelessEffect<C, O>, t: number, context: ContextBuilder<C>): O[] {
    // The same time draws the same random numbers.
    const random = seeded(this.#seed ^ hashSeed(t.toFixed(6)));
    const started = this.#now();
    const output = module.sample(context({ t, dt: 0, random }));
    this.#time(started);
    return Array.isArray(output) ? output : [];
  }

  #stateful(module: StatefulEffect<C, O>, t: number, context: ContextBuilder<C>): O[] {
    const dt = this.#dt;
    const first = -Math.round((module.warmup ?? 0) / dt);
    const target = Math.max(first, Math.floor(t / dt + STEP_EPSILON));
    // The nearest known state at or before the target: where the run is, or a checkpoint.
    let from: Snapshot | undefined = this.#cursor && this.#cursor.step <= target ? this.#cursor : undefined;
    for (const checkpoint of this.#checkpoints.values()) {
      if (checkpoint.step <= target && (!from || checkpoint.step > from.step)) {
        from = { ...checkpoint, state: structuredClone(checkpoint.state) };
      }
    }
    let step: number;
    let state: unknown;
    let random: ReturnType<typeof seeded>;
    if (from) {
      step = from.step;
      state = from.state;
      random = seeded(from.random);
    } else {
      step = first;
      random = seeded(this.#seed);
      state = module.init(context({ t: step * dt, dt, random }));
      this.#keep({ step, state, random: random.state() });
    }
    while (step < target) {
      step++;
      const started = this.#now();
      state = module.step(state, context({ t: step * dt, dt, random }));
      this.#time(started);
      if (this.#status.state === 'paused') {
        return [];
      }
      if (step % this.#checkpointSteps === 0) {
        this.#keep({ step, state, random: random.state() });
      }
    }
    this.#cursor = { step, state, random: random.state() };
    return module.draw(state, context({ t: step * dt, dt, random })) ?? [];
  }

  #keep(snapshot: Snapshot): void {
    if (!this.#checkpoints.has(snapshot.step)) {
      this.#checkpoints.set(snapshot.step, { ...snapshot, state: structuredClone(snapshot.state) });
    }
  }

  #time(started: number): void {
    this.#timings.push(this.#now() - started);
    if (this.#timings.length > BUDGET_WINDOW) {
      this.#timings.shift();
    }
    const mean = this.#meanStep();
    if (this.#timings.length >= BUDGET_WINDOW / 2 && mean > this.#budgetMs) {
      this.#status = {
        state: 'paused',
        reason: 'budget',
        message: `A step takes ${mean.toFixed(1)} ms on average, over the ${this.#budgetMs} ms budget.`,
      };
    }
  }

  #meanStep(): number {
    return this.#timings.length === 0 ? 0 : this.#timings.reduce((sum, time) => sum + time, 0) / this.#timings.length;
  }
}
