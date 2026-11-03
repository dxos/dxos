//
// Copyright 2026 DXOS.org
//

//
// The effect contract as the animator hosts it (DESIGN.md §6): what each step of an effect sees, and the jobs the
// effect core runs. Everything here is plain data, so it crosses to the effect worker by structured clone.
//

import { type EffectStep, type Track } from '@dxos/animation';

import { type Animation, type AnimatorCapabilities } from '#types';

/** The one module an effect may import: `defineEffect` and the math helpers (`helpers.ts`). */
export const EFFECT_MODULE = '@dxos/plugin-animator/effect';

/** What a bound parameter resolves to: the stage's objects or links it names. */
export type Bound = ReadonlyArray<AnimatorCapabilities.BoundObject | AnimatorCapabilities.BoundLink>;

/** What one step (or sample) of an effect sees. */
export type EffectContext<P = Record<string, unknown>> = EffectStep & {
  /** The renderer the effect draws for, so one module can serve `2d` and `3d`. */
  renderer: Animation.EffectRenderer;
  /** The instance's seed, for randomness that must not change with the time (a particle's direction). */
  seed: number;
  /** The parameters at this time, keyed values applied. */
  params: P;
  /** Seconds the effect runs for in the shot. */
  duration: number;
  /** Every object of the stage at this time. */
  objects: Readonly<Record<string, AnimatorCapabilities.BoundObject>>;
  /** Every link of the stage at this time. */
  links: readonly AnimatorCapabilities.BoundLink[];
  /**
   * Parameters marked as bindings (`x-binding: 'object' | 'link'`), resolved: ids become geometry, ids that name
   * nothing are left out, and a binding left unset binds every object or link.
   */
  bound: Readonly<Record<string, Bound>>;
};

/** A stage's bindings across a shot, sampled at a fixed rate from its start; read between samples by interpolation. */
export type BindingTrack = { rate: number; frames: AnimatorCapabilities.StageBinding[] };

/** One effect instance to run in a shot: which compiled module (by key), with what, and when. */
export type EffectJob = {
  instance: string;
  /** The compiled module: an effect revision (`<effect>@<version>`). */
  key: string;
  renderer: Animation.EffectRenderer;
  params: Record<string, unknown>;
  /** The parameter schema, whose `x-binding` properties name objects or links. */
  schema?: Record<string, unknown>;
  seed: number;
  /** Seconds into the shot the effect runs from and to; its own time starts at 0 at `start`. */
  start: number;
  end: number;
  /** Keyed parameters: the shot's `effect:<instance>` tracks. */
  tracks: Track[];
};
