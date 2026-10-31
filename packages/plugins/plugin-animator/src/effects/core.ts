//
// Copyright 2026 DXOS.org
//

//
// What the effect worker does, as a plain class, so the worker (`worker.ts`), a headless check and node tests share it:
// it holds the compiled modules, the shot's bindings and jobs, and one runner per effect instance, and answers frame
// requests with each instance's output at a time in the shot (F-5.1, F-5.2).
//

import {
  type EffectModule,
  EffectRunner,
  type EffectStep,
  type RunnerOptions,
  isInstance3D,
  isOverlayItem,
  isShape2D,
  loadEffectModule,
  trackValue,
} from '@dxos/animation';

import { type Animation, type AnimatorCapabilities } from '#types';

import { bindingAt, bindingsOf, resolveBound } from './binding.ts';
import * as helpers from './helpers.ts';
import { type BindingTrack, EFFECT_MODULE, type EffectContext, type EffectJob } from './types.ts';

export type CoreRequest =
  | { type: 'load'; key: string; code: string }
  | { type: 'shot'; binding: BindingTrack; jobs: EffectJob[] }
  | { type: 'frame'; id: number; t: number };

export type CoreResponse = { type: 'frame'; id: number; t: number; frames: AnimatorCapabilities.EffectFrame[] };

type Module = EffectModule<EffectContext, unknown>;

/** Loads compiled effect code; throws with a reason when its default export is not an effect. */
export const loadEffect = (code: string): Module =>
  loadEffectModule<EffectContext, unknown>(code, { modules: { [EFFECT_MODULE]: helpers }, define: 'defineEffect' });

/** A frame holding only what the renderer draws: anything else a module returns is dropped. */
export const effectFrame = (
  instance: string,
  renderer: Animation.EffectRenderer,
  items: readonly unknown[],
  status?: AnimatorCapabilities.EffectFrame['status'],
  stepMs?: number,
): AnimatorCapabilities.EffectFrame => {
  const extra = { ...(status ? { status } : {}), ...(stepMs !== undefined ? { stepMs } : {}) };
  switch (renderer) {
    case '2d':
      return { instance, renderer, items: items.filter(isShape2D), ...extra };
    case '3d':
      return { instance, renderer, items: items.filter(isInstance3D), ...extra };
    case 'overlay':
      return { instance, renderer, items: items.filter(isOverlayItem), ...extra };
  }
};

/** The context one step of `job` sees at `step.t` seconds into the effect. */
export const effectContext = (job: EffectJob, binding: BindingTrack | undefined, step: EffectStep): EffectContext => {
  const shotTime = job.start + step.t;
  const params: Record<string, unknown> = { ...job.params };
  for (const track of job.tracks) {
    const value = trackValue(track, shotTime);
    if (value !== undefined) {
      params[track.property] = value;
    }
  }
  const bound = bindingAt(binding, shotTime);
  return {
    ...step,
    renderer: job.renderer,
    seed: job.seed,
    params,
    duration: job.end - job.start,
    objects: bound.objects,
    links: bound.links,
    bound: resolveBound(bound, params, bindingsOf(job.schema)),
  };
};

export class EffectCore {
  readonly #modules = new Map<string, Module | Error>();
  readonly #runners = new Map<string, { signature: string; runner: EffectRunner<EffectContext, unknown> }>();
  readonly #options: Omit<RunnerOptions, 'seed'>;
  #binding: BindingTrack | undefined;
  #bindingSignature = '';
  #jobs: EffectJob[] = [];

  constructor(options: Omit<RunnerOptions, 'seed'> = {}) {
    this.#options = options;
  }

  handle(request: CoreRequest): CoreResponse | undefined {
    switch (request.type) {
      case 'load': {
        try {
          this.#modules.set(request.key, loadEffect(request.code));
        } catch (error) {
          this.#modules.set(request.key, error instanceof Error ? error : new Error(String(error)));
        }
        return undefined;
      }
      case 'shot': {
        // Moved bindings change what every effect draws on, so every run starts over.
        const signature = JSON.stringify(request.binding);
        if (signature !== this.#bindingSignature) {
          this.#bindingSignature = signature;
          this.#runners.clear();
        }
        this.#binding = request.binding;
        this.#jobs = request.jobs;
        return undefined;
      }
      case 'frame':
        return { type: 'frame', id: request.id, t: request.t, frames: this.frames(request.t) };
    }
  }

  /** Every running instance's frame at `t` seconds into the shot. */
  frames(t: number): AnimatorCapabilities.EffectFrame[] {
    const frames: AnimatorCapabilities.EffectFrame[] = [];
    for (const job of this.#jobs) {
      if (t < job.start || t > job.end) {
        continue;
      }
      const module = this.#modules.get(job.key);
      if (!module) {
        continue;
      }
      if (module instanceof Error) {
        frames.push(
          effectFrame(job.instance, job.renderer, [], { state: 'paused', reason: 'error', message: module.message }),
        );
        continue;
      }
      const binding = this.#binding;
      const { output, status, stepMs } = this.#runner(job, module).frame(t - job.start, (step) =>
        effectContext(job, binding, step),
      );
      frames.push(effectFrame(job.instance, job.renderer, output, status, stepMs));
    }
    return frames;
  }

  #runner(job: EffectJob, module: Module): EffectRunner<EffectContext, unknown> {
    // A changed parameter, key or span is a different run: its checkpoints no longer hold.
    const signature = JSON.stringify(job);
    const existing = this.#runners.get(job.instance);
    if (existing?.signature === signature) {
      return existing.runner;
    }
    const runner = new EffectRunner<EffectContext, unknown>(module, { ...this.#options, seed: job.seed });
    this.#runners.set(job.instance, { signature, runner });
    return runner;
  }
}
