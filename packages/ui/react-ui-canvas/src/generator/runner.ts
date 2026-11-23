//
// Copyright 2026 DXOS.org
//

//
// One generator on one node (ANIMATION.md §6.2): the effect runtime of @dxos/animation, stepped with a context built
// from the scene as the host draws it. Pure of the DOM: the worker runs it, and so does a headless check.
//

import { EffectRunner, type EffectStatus, type EffectStep, type RunnerOptions } from '@dxos/animation';
import { type Bounds, type NodeId, isGeneratorNode } from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { flattenPath, nodeBounds, viewLinkGeometry } from '../utils/index.ts';
import {
  type BoundLink,
  type BoundNode,
  type GeneratorContext,
  type GeneratorFrame,
  type GeneratorModule,
  type Shape,
} from './types.ts';

/** What a frame is computed from: the scene as the host draws it, and the generator's node in it. */
export type RunnerInput = {
  scene: RenderList2D;
  node: NodeId;
  /** The parameter schema, whose `x-binding` properties name nodes or links to resolve. */
  schema?: Record<string, unknown>;
};

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
  scene: RenderList2D,
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

/**
 * One generator on one node. `frame(t, input)` returns its shapes at time `t`; a stateful generator steps from the
 * nearest earlier checkpoint (or where it last was, if nearer), so scrubbing back costs at most two seconds of steps.
 * An error or a run over budget pauses it; `reset` (a revision, an edit to the scene) starts it over.
 */
export class GeneratorRunner {
  readonly #runner: EffectRunner<GeneratorContext, Shape>;

  constructor(module: GeneratorModule, options: RunnerOptions) {
    this.#runner = new EffectRunner(module, { ...options, accept: isShape });
  }

  get status(): EffectStatus {
    return this.#runner.status;
  }

  /** How many checkpoints are held (for tests and the check operation). */
  get checkpoints(): number {
    return this.#runner.checkpoints;
  }

  /** Forgets every state, checkpoint and pause, as after a revision or an edit to what it is bound to. */
  reset(): void {
    this.#runner.reset();
  }

  /** The shapes at time `t`. */
  frame(t: number, input: RunnerInput): GeneratorFrame {
    const { output, status, stepMs } = this.#runner.frame(t, (step) => this.#context(step, input));
    return { shapes: output, status, stepMs };
  }

  #context({ t, dt, random }: EffectStep, { scene, ...input }: RunnerInput): GeneratorContext {
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
}
