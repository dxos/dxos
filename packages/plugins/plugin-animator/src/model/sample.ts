//
// Copyright 2026 DXOS.org
//

//
// Sampling (F-3, DESIGN.md §7): a shot's script compiles to keys, its hand keys merge over them, and every track is
// read at a time into a `Sample` the stage applies to a view of its objects.
//

import {
  type AnimatableKind,
  type CaptionSpan,
  type EffectSpan,
  SCRIPT_CAMERA_TARGET,
  type Timeline,
  type Track,
  compileScript,
  mergeTimelines,
  trackValue,
} from '@dxos/animation';
import { type Obj } from '@dxos/echo';

import { type Animation, type AnimatorCapabilities } from '#types';

/** What a script compiles against: the stage's targets at rest, its camera, and its arrangers. */
export type StageContext = {
  targets: readonly AnimatorCapabilities.StageTarget[];
  camera?: Record<string, unknown>;
  layouts?: AnimatorCapabilities.StageDef['layouts'];
  scriptProperties?: AnimatorCapabilities.StageDef['scriptProperties'];
};

/** A shot ready to sample: its keys (script and hand merged), and its script's captions and effects as spans. */
export type CompiledShot = {
  timeline: Timeline;
  captions: CaptionSpan[];
  effects: EffectSpan<Animation.EffectInstance>[];
};

/** The context of a stage object, from the stage that renders it. */
export const stageContext = (stage: AnimatorCapabilities.StageDef, object: Obj.Unknown): StageContext => ({
  targets: stage.targets(object),
  camera: stage.camera?.values?.(object),
  layouts: stage.layouts,
  scriptProperties: stage.scriptProperties,
});

/** The interpolation kind of each property path the targets declare; the first declaration wins. */
const propertyKinds = (targets: readonly AnimatorCapabilities.StageTarget[]): Record<string, AnimatableKind> => {
  const kinds: Record<string, AnimatableKind> = {};
  for (const target of targets) {
    for (const { path, kind } of target.properties) {
      kinds[path] ??= kind;
    }
  }
  return kinds;
};

/**
 * The shot's keys: its script compiled against `context` with its hand keys merged over (a hand key wins, F-3.2).
 * A shot without a script, or without a context to compile it against, is its hand keys. Throws `ScriptError`.
 */
export const compileShot = (shot: Animation.Shot, context?: StageContext): CompiledShot => {
  if (!shot.script || shot.script.length === 0 || !context) {
    return { timeline: shot.timeline, captions: [], effects: [] };
  }
  const compiled = compileScript<Animation.EffectInstance>(shot.script, {
    targets: Object.fromEntries(context.targets.map((target) => [target.id, target.values])),
    layouts: context.layouts,
    duration: shot.duration,
    properties: context.scriptProperties,
    kinds: propertyKinds(context.targets),
    camera: context.camera,
  });
  return {
    timeline: mergeTimelines(shot.timeline, compiled.timeline),
    captions: compiled.captions,
    effects: compiled.effects,
  };
};

/**
 * Every track of `timeline` read at `t` seconds: target tracks into `values`, camera tracks (and the shot's own
 * camera track, whose values are records) into `camera`. A track with no keys contributes nothing.
 */
export const sampleTimeline = (timeline: Timeline, t: number, cameraTrack?: Track): AnimatorCapabilities.Sample => {
  const values: Record<string, Record<string, unknown>> = {};
  let camera: Record<string, unknown> | undefined;
  for (const track of Object.values(timeline.tracks)) {
    const value = trackValue(track, t);
    if (value === undefined) {
      continue;
    }
    if (track.target === SCRIPT_CAMERA_TARGET) {
      camera = { ...camera, [track.property]: value };
    } else {
      values[track.target] = { ...values[track.target], [track.property]: value };
    }
  }
  const shotCamera = cameraTrack ? trackValue(cameraTrack, t) : undefined;
  if (typeof shotCamera === 'object' && shotCamera !== null) {
    camera = { ...shotCamera, ...camera };
  }
  return { t, values, ...(camera ? { camera } : {}) };
};

/** The captions on screen at `t`. */
export const captionAt = (captions: readonly CaptionSpan[], t: number): string | undefined =>
  captions.find((caption) => t >= caption.start && t < caption.end)?.text;
