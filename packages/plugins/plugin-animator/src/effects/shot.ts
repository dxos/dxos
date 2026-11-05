//
// Copyright 2026 DXOS.org
//

//
// A shot's effects as jobs for the effect core: the instances placed on the shot (which run for all of it) and those
// its script adds (which run over their spans), each with its compiled module's key and its keyed parameters.
//

import { type EffectSpan, type Timeline, hashSeed } from '@dxos/animation';

import { type Animation } from '#types';

import { type EffectJob } from './types.ts';

/** The fields of an Effect a job is built from. */
export type EffectSource = Pick<Animation.Effect, 'id' | 'renderer' | 'source' | 'params' | 'version'>;

/** Every effect instance of a shot with its span: placed instances for the whole shot, then the script's. */
export const placedEffects = (
  shot: Pick<Animation.Shot, 'effects' | 'duration'>,
  scripted: readonly EffectSpan<Animation.EffectInstance>[] = [],
): EffectSpan<Animation.EffectInstance>[] => [
  ...shot.effects.map((effect) => ({ effect, start: 0, end: shot.duration })),
  ...scripted,
];

/** The module key of an effect revision. */
export const effectKey = (effect: Pick<EffectSource, 'id' | 'version'>) => `${effect.id}@${effect.version}`;

/**
 * The jobs for `spans` and the source of each module they run. An instance whose effect is not loaded (`resolve`
 * returns nothing) is left out until it is.
 */
export const effectJobs = (
  spans: readonly EffectSpan<Animation.EffectInstance>[],
  timeline: Timeline,
  resolve: (instance: Animation.EffectInstance) => EffectSource | undefined,
): { jobs: EffectJob[]; sources: Record<string, string> } => {
  const jobs: EffectJob[] = [];
  const sources: Record<string, string> = {};
  for (const { effect: instance, start, end } of spans) {
    const effect = resolve(instance);
    if (!effect) {
      continue;
    }
    const key = effectKey(effect);
    sources[key] = effect.source;
    const target = `effect:${instance.id}`;
    jobs.push({
      instance: instance.id,
      key,
      renderer: effect.renderer,
      // Plain copies, so a job can be cloned to the worker and compared by value.
      params: JSON.parse(JSON.stringify(instance.params)),
      schema: JSON.parse(JSON.stringify(effect.params)),
      seed: instance.seed ?? hashSeed(instance.id),
      start,
      end,
      tracks: JSON.parse(JSON.stringify(Object.values(timeline.tracks).filter((track) => track.target === target))),
    });
  }
  return { jobs, sources };
};
