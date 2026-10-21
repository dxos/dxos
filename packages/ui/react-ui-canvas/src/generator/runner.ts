//
// Copyright 2026 DXOS.org
//

//
// The generator runtime's core (ANIMATION.md §6.2): one generator on one node, sampled at any time. A stateful
// generator steps at a fixed rate with a seeded random from `init`, keeping a checkpoint every two seconds, so the same
// time always gives the same shapes however it was reached (playback, a scrub back, export). Pure of the DOM: the
// worker runs it, and so does a headless check.
//

import { type Bounds, type NodeId, type View, isGeneratorNode, sampleView } from '../model/index.ts';
import { flattenPath, nodeBounds, viewLinkGeometry } from '../utils/index.ts';
import { hashSeed, seeded } from './motion.ts';
import {
  type BoundLink,
  type BoundNode,
  type GeneratorContext,
  type GeneratorFrame,
  type GeneratorModule,
  type GeneratorStatus,
  type Shape,
  isStateful,
} from './types.ts';

/** Steps per second of a stateful generator, whatever the display's frame rate. */
export const STEP_RATE = 120;
/** Seconds between checkpoints. */
export const CHECKPOINT_INTERVAL = 2;
/** Milliseconds a step may take, on average over the recent window, before the generator is paused. */
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

/** What a frame is computed from: the scene as stored (it is sampled per step), and the generator's node in it. */
export type RunnerInput = {
  scene: View;
  node: NodeId;
  /** The parameter schema, whose `x-binding` properties name nodes or links to resolve. */
  schema?: Record<string, unknown>;
};

type Snapshot = { step: number; state: unknown; random: number };

const EMPTY_BOUNDS: Bounds = { x: 0, y: 0, width: 0, height: 0 };

/** The property names of a JSON schema that are bindings, and to what. */
export const bindingsOf = (schema: Record<string, unknown> | undefined): Record<string, 'node' | 'link'> => {
  const properties = schema?.properties;
  const result: Record<string, 'node' | 'link'> = {};
  if (typeof properties !== 'object' || properties === null) {
    return result;
  }
  for (const [name, property] of Object.entries(properties)) {
    const binding: unknown =
      typeof property === 'object' && property !== null ? Reflect.get(property, 'x-binding') : undefined;
    if (binding === 'node' || binding === 'link') {
      result[name] = binding;
    }
  }
  return result;
};

/** The bindings among `params`, resolved against `scene`: ids that name nothing there are left out. */
export const resolveBindings = (
  scene: View,
  params: Record<string, unknown>,
  bindings: Record<string, 'node' | 'link'>,
): Record<string, ReadonlyArray<BoundNode | BoundLink>> => {
  const result: Record<string, ReadonlyArray<BoundNode | BoundLink>> = {};
  for (const [name, kind] of Object.entries(bindings)) {
    const value = params[name];
    const ids = (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === 'string');
    if (kind === 'node') {
      result[name] = ids.flatMap((id) => {
        const node = scene.nodes[id];
        return node ? [{ id, center: node.center, size: node.size, bounds: nodeBounds(node), node }] : [];
      });
    } else {
      const links = ids.flatMap((id) => scene.links[id] ?? []);
      // Routed without a registry: each node's own ports, else the default ports.
      result[name] = viewLinkGeometry(scene, {}, links).map(({ link, path }) => ({
        id: link.id,
        path,
        points: flattenPath(path).flat(),
      }));
    }
  }
  return result;
};

const isShape = (value: unknown): value is Shape => {
  const kind = typeof value === 'object' && value !== null ? Reflect.get(value, 'kind') : undefined;
  return kind === 'circle' || kind === 'rect' || kind === 'path' || kind === 'instance';
};

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * One generator on one node. `frame(t, input)` returns its shapes at time `t`; a stateful generator steps from the
 * nearest earlier checkpoint (or where it last was, if nearer), so scrubbing back costs at most two seconds of steps.
 * An error or a run over budget pauses it; `reset` (a revision, an edit to the scene) starts it over.
 */
export class GeneratorRunner {
  readonly #module: GeneratorModule;
  readonly #seed: number;
  readonly #dt: number;
  readonly #checkpointSteps: number;
  readonly #budgetMs: number;
  readonly #now: () => number;
  readonly #checkpoints = new Map<number, Snapshot>();
  #cursor: Snapshot | undefined;
  #status: GeneratorStatus = { state: 'running' };
  #timings: number[] = [];

  constructor(
    module: GeneratorModule,
    {
      seed,
      stepRate = STEP_RATE,
      checkpointInterval = CHECKPOINT_INTERVAL,
      budgetMs = STEP_BUDGET_MS,
      now = () => 0,
    }: RunnerOptions,
  ) {
    this.#module = module;
    this.#seed = seed;
    this.#dt = 1 / stepRate;
    this.#checkpointSteps = Math.max(1, Math.round(checkpointInterval * stepRate));
    this.#budgetMs = budgetMs;
    this.#now = now;
  }

  get status(): GeneratorStatus {
    return this.#status;
  }

  /** How many checkpoints are held (for tests and the check operation). */
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

  /** The shapes at time `t`. */
  frame(t: number, input: RunnerInput): GeneratorFrame {
    if (this.#status.state === 'paused') {
      return { shapes: [], status: this.#status, stepMs: this.#meanStep() };
    }
    try {
      const shapes = isStateful(this.#module) ? this.#stateful(t, input) : this.#stateless(t, input);
      return { shapes: shapes.filter(isShape), status: this.#status, stepMs: this.#meanStep() };
    } catch (error) {
      this.#status = { state: 'paused', reason: 'error', message: message(error) };
      return { shapes: [], status: this.#status, stepMs: this.#meanStep() };
    }
  }

  #stateless(t: number, input: RunnerInput): Shape[] {
    if (isStateful(this.#module)) {
      return [];
    }
    // The same time draws the same random numbers.
    const random = seeded(this.#seed ^ hashSeed(t.toFixed(6)));
    const started = this.#now();
    const shapes = this.#module.sample(this.#context(t, 0, input, random));
    this.#time(started);
    return Array.isArray(shapes) ? shapes : [];
  }

  #stateful(t: number, input: RunnerInput): Shape[] {
    const module = this.#module;
    if (!isStateful(module)) {
      return [];
    }
    const first = -Math.round((module.warmup ?? 0) / this.#dt);
    const target = Math.max(first, Math.floor(t / this.#dt + STEP_EPSILON));
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
      state = module.init(this.#context(step * this.#dt, this.#dt, input, random));
      this.#keep({ step, state, random: random.state() });
    }
    while (step < target) {
      step++;
      const started = this.#now();
      state = module.step(state, this.#context(step * this.#dt, this.#dt, input, random));
      this.#time(started);
      if (this.#status.state === 'paused') {
        return [];
      }
      if (step % this.#checkpointSteps === 0) {
        this.#keep({ step, state, random: random.state() });
      }
    }
    this.#cursor = { step, state, random: random.state() };
    return module.draw(state, this.#context(step * this.#dt, this.#dt, input, random)) ?? [];
  }

  #keep(snapshot: Snapshot): void {
    if (!this.#checkpoints.has(snapshot.step)) {
      this.#checkpoints.set(snapshot.step, { ...snapshot, state: structuredClone(snapshot.state) });
    }
  }

  #context(t: number, dt: number, input: RunnerInput, random: () => number): GeneratorContext {
    const scene = sampleView(input.scene, t);
    const node = scene.nodes[input.node];
    const params = (node && isGeneratorNode(node) ? node.params : undefined) ?? {};
    return {
      t,
      dt,
      params,
      random,
      scene,
      bounds: node ? nodeBounds(node) : EMPTY_BOUNDS,
      bound: resolveBindings(scene, params, bindingsOf(input.schema)),
    };
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
