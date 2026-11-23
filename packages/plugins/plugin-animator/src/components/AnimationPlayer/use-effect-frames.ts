//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useEffect, useMemo, useState } from 'react';

import { type EffectSpan, type ModuleCompiler } from '@dxos/animation';
import { Obj } from '@dxos/echo';

import {
  type EffectFrames,
  EffectHost,
  type EffectShot,
  type EffectSource,
  EMPTY_BINDING,
  bindingTrack,
  effectJobs,
  placedEffects,
} from '#effects';
import { type CompiledShot, sampleTimeline } from '#model';
import { type Animation, type AnimatorCapabilities } from '#types';

const NO_FRAMES: AnimatorCapabilities.EffectFrame[] = [];

export type UseEffectFramesProps = {
  shot: Animation.Shot | undefined;
  compiled: CompiledShot | undefined;
  stage: AnimatorCapabilities.StageDef | undefined;
  object: Obj.Unknown | undefined;
  /** Seconds into the shot. */
  t: number;
  compile: ModuleCompiler;
  createWorker?: () => Worker;
};

/** The effect objects the spans reference, loaded through their references; undefined until each loads. */
const useEffectSources = (spans: readonly EffectSpan<Animation.EffectInstance>[]) => {
  const atom = useMemo(
    () => Atom.make((get) => spans.map((span): EffectSource | undefined => get(Obj.atom(span.effect.effect)))),
    [spans],
  );
  return useAtomValue(atom);
};

/**
 * The frames of the shot's effects at `t`, computed by the effect runtime (in a worker when one is given) from the
 * stage's bindings across the shot. Empty for a shot with no effects, and while the first frame is computed.
 */
export const useEffectFrames = ({
  shot,
  compiled,
  stage,
  object,
  t,
  compile,
  createWorker,
}: UseEffectFramesProps): AnimatorCapabilities.EffectFrame[] => {
  const spans = useMemo(
    () => (shot && compiled ? placedEffects(shot, compiled.effects) : []),
    [shot?.effects, shot?.duration, compiled],
  );
  const sources = useEffectSources(spans);
  const effectShot = useMemo<EffectShot | undefined>(() => {
    if (!shot || !compiled || spans.length === 0) {
      return undefined;
    }
    const { jobs, sources: modules } = effectJobs(
      spans,
      compiled.timeline,
      (instance) => sources[spans.findIndex((span) => span.effect === instance)],
    );
    const bind = stage?.bind;
    const binding =
      bind && object
        ? bindingTrack(shot.duration, (time) => bind(object, sampleTimeline(compiled.timeline, time, shot.camera)))
        : bindingTrack(0, () => EMPTY_BINDING);
    return { binding, jobs, sources: modules };
  }, [shot?.duration, shot?.camera, compiled, spans, sources, stage, object]);

  const active = (effectShot?.jobs.length ?? 0) > 0;
  const [host, setHost] = useState<EffectHost>();
  const [frames, setFrames] = useState<EffectFrames>();
  // Created only while there are effects to run, so a shot without any starts no worker.
  useEffect(() => {
    if (!active) {
      return;
    }
    const next = new EffectHost({ compile, createWorker, onFrames: setFrames });
    setHost(next);
    return () => {
      next.dispose();
      setHost(undefined);
      setFrames(undefined);
    };
  }, [active, compile, createWorker]);
  useEffect(() => {
    if (host && effectShot) {
      host.update(effectShot);
    }
  }, [host, effectShot]);
  useEffect(() => {
    if (host && effectShot) {
      host.request(t);
    }
  }, [host, effectShot, t]);
  // A new shot's effects replace the last shot's frames once they arrive.
  useEffect(() => setFrames(undefined), [shot?.id]);

  return active && frames ? frames.frames : NO_FRAMES;
};
