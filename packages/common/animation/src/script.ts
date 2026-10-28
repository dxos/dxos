//
// Copyright 2026 DXOS.org
//

//
// Declarative scripts (plugin-animator DESIGN.md §5.3, F-3): a list of beats, each a state the shot moves into,
// compiled to keys. Compilation is pure and deterministic, so a script can be re-edited and recompiled at any time;
// hand keys are merged over the result with `mergeTimelines`.
//

import { createTimeline, setKey } from './timeline.ts';
import { type AnimatableKind, type Easing, type Timeline } from './types.ts';
import { isRecord } from './util.ts';

/** An effect placed by a script; the animator's `EffectInstance` (with its effect reference) fits it. */
export type ScriptEffect = { id: string };

/** One state in a script. Targets are stage-local ids. */
export type Beat<E extends ScriptEffect = ScriptEffect> = {
  /** Seconds into the shot; default: when the previous beat ends. */
  at?: number;
  /** How long the move into this state takes. */
  duration: number;
  ease?: Easing;
  /** Targets that appear: scale and opacity rise from 0 to their resting values. */
  show?: readonly string[];
  /** Targets that disappear: scale and opacity fall to 0. */
  hide?: readonly string[];
  /** Target → property → value. */
  set?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Positions from an arranger the stage contributes, so the script states intent and the stage computes places. */
  layout?: { kind: string; targets: readonly string[]; params?: Readonly<Record<string, unknown>> };
  /** `from` targets close on `into` and shrink away while `into` grows. */
  merge?: { from: readonly string[]; into: string };
  /** Camera property → value. */
  camera?: Readonly<Record<string, unknown>>;
  effects?: { add?: readonly E[]; remove?: readonly string[] };
  /** Replaces the caption on screen; an empty string clears it. */
  caption?: string;
};

/** What an arranger is told: the targets to place, the beat's params, and every target's values before the beat. */
export type ArrangeInput = {
  targets: readonly string[];
  params: Readonly<Record<string, unknown>>;
  values: (target: string) => Readonly<Record<string, unknown>>;
};

/** Places targets: a position value per target. A target it leaves out keeps its position. */
export type Arranger = (input: ArrangeInput) => Readonly<Record<string, unknown>>;

/** The property names a script writes, which differ by stage (a 2D `center` or a 3D `position`). */
export type ScriptProperties = { position: string; scale: string; opacity: string };

export const DEFAULT_SCRIPT_PROPERTIES: ScriptProperties = { position: 'position', scale: 'scale', opacity: 'opacity' };

export type ScriptOptions = {
  /** Every target the script may name, with its property values at the start of the shot. */
  targets: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Arrangers by layout kind. */
  layouts?: Readonly<Record<string, Arranger>>;
  /** Seconds; the timeline's length. */
  duration: number;
  properties?: Partial<ScriptProperties>;
  /** Interpolation kind by property, recorded on the tracks the script creates (a `rotation`, a `color`). */
  kinds?: Readonly<Record<string, AnimatableKind>>;
  /** The target camera keys go on. */
  cameraTarget?: string;
  /** Camera property values at the start of the shot. */
  camera?: Readonly<Record<string, unknown>>;
};

/** An effect live from `start` to `end` seconds. */
export type EffectSpan<E extends ScriptEffect = ScriptEffect> = { effect: E; start: number; end: number };

/** A caption on screen from `start` to `end` seconds. */
export type CaptionSpan = { text: string; start: number; end: number };

/**
 * A compiled script: keys in `timeline`; effects and captions as spans beside it, since neither is a property of a
 * stage target.
 */
export type CompiledScript<E extends ScriptEffect = ScriptEffect> = {
  timeline: Timeline;
  effects: EffectSpan<E>[];
  captions: CaptionSpan[];
};

/** A script that cannot compile; `beat` is the index of the beat at fault. */
export class ScriptError extends Error {
  readonly beat: number;

  constructor(beat: number, message: string) {
    super(`Beat ${beat}: ${message}`);
    this.name = 'ScriptError';
    this.beat = beat;
  }
}

/** The camera's target when the options name none. */
export const SCRIPT_CAMERA_TARGET = 'camera';

/** A value of the same shape as `value` with every axis 0: a number, a point, a size or a vec3. */
const zeroLike = (value: unknown): unknown => scaleLike(value, 0) ?? 0;

/** `value` with every axis multiplied by `factor`; undefined when it is not a number or a record of numbers. */
const scaleLike = (value: unknown, factor: number): unknown => {
  if (typeof value === 'number') {
    return value * factor;
  }
  if (isRecord(value) && Object.values(value).every((axis) => typeof axis === 'number')) {
    return Object.fromEntries(Object.entries(value).map(([axis, amount]) => [axis, Number(amount) * factor]));
  }
  return undefined;
};

/** The growth of a merge's `into` per target merged: area-preserving, as discs merging. */
const mergeGrowth = (merged: number) => Math.sqrt(1 + merged);

/**
 * Compiles a script to keys (F-3.1). Each change a beat makes is keyed twice: the value held at the beat's start and
 * the new value, eased, at its end. A target first named by a `show` starts hidden. Beats are applied in order, so
 * where two overlapping beats change the same property, the later wins from its start. Unknown targets, layouts and
 * effects throw a `ScriptError` naming the beat (F-3.4).
 */
export const compileScript = <E extends ScriptEffect = ScriptEffect>(
  script: readonly Beat<E>[],
  options: ScriptOptions,
): CompiledScript<E> => {
  const properties = { ...DEFAULT_SCRIPT_PROPERTIES, ...options.properties };
  const cameraTarget = options.cameraTarget ?? SCRIPT_CAMERA_TARGET;
  const kinds = options.kinds ?? {};

  // The scale and opacity each target shows at when visible, and its current values (scale and opacity always set, so
  // the first move of either holds from a known value).
  const rest = new Map<string, { scale: unknown; opacity: unknown }>(
    Object.entries(options.targets).map(([target, values]) => [
      target,
      { scale: values[properties.scale] ?? 1, opacity: values[properties.opacity] ?? 1 },
    ]),
  );
  const state = new Map<string, Record<string, unknown>>(
    Object.entries(options.targets).map(([target, values]) => [
      target,
      { ...values, [properties.scale]: rest.get(target)?.scale, [properties.opacity]: rest.get(target)?.opacity },
    ]),
  );
  state.set(cameraTarget, { ...options.camera });

  // A target first named by `show` starts hidden.
  const seen = new Set<string>();
  for (const beat of script) {
    for (const target of beat.show ?? []) {
      if (!seen.has(target) && state.has(target)) {
        const values = state.get(target) ?? {};
        values[properties.scale] = zeroLike(rest.get(target)?.scale);
        values[properties.opacity] = 0;
      }
    }
    for (const target of mentioned(beat)) {
      seen.add(target);
    }
  }

  let timeline = createTimeline(options.duration);
  const effects: EffectSpan<E>[] = [];
  const open = new Map<string, EffectSpan<E>>();
  const captions: CaptionSpan[] = [];
  let caption: CaptionSpan | undefined;
  const times = beatTimes(script);

  script.forEach((beat, index) => {
    const { start, end } = times[index];

    const known = (target: string) => {
      if (!state.has(target) || target === cameraTarget) {
        throw new ScriptError(index, `unknown target '${target}'.`);
      }
      return target;
    };

    // Every change this beat makes, by target then property, in the order the beat states them.
    const changes = new Map<string, Map<string, unknown>>();
    const change = (target: string, property: string, value: unknown) => {
      const byProperty = changes.get(target) ?? new Map<string, unknown>();
      byProperty.set(property, value);
      changes.set(target, byProperty);
    };

    for (const target of beat.show ?? []) {
      const resting = rest.get(known(target));
      change(target, properties.scale, resting?.scale ?? 1);
      change(target, properties.opacity, resting?.opacity ?? 1);
    }
    for (const target of beat.hide ?? []) {
      change(known(target), properties.scale, zeroLike(rest.get(target)?.scale));
      change(target, properties.opacity, 0);
    }
    for (const [target, values] of Object.entries(beat.set ?? {})) {
      for (const [property, value] of Object.entries(values)) {
        change(known(target), property, value);
      }
    }
    if (beat.layout) {
      const { kind, targets, params = {} } = beat.layout;
      const arranger = options.layouts?.[kind];
      if (!arranger) {
        throw new ScriptError(index, `unknown layout '${kind}'.`);
      }
      targets.forEach(known);
      const positions = arranger({ targets, params, values: (target) => state.get(target) ?? {} });
      for (const target of targets) {
        if (Object.hasOwn(positions, target)) {
          change(target, properties.position, positions[target]);
        }
      }
    }
    if (beat.merge) {
      const { from, into } = beat.merge;
      const destination = state.get(known(into)) ?? {};
      for (const target of from) {
        change(known(target), properties.position, destination[properties.position]);
        change(target, properties.scale, zeroLike(rest.get(target)?.scale));
        change(target, properties.opacity, 0);
      }
      const grown = scaleLike(destination[properties.scale] ?? 1, mergeGrowth(from.length));
      if (grown !== undefined) {
        change(into, properties.scale, grown);
        const resting = rest.get(into);
        if (resting) {
          resting.scale = grown;
        }
      }
    }
    for (const [property, value] of Object.entries(beat.camera ?? {})) {
      change(cameraTarget, property, value);
    }

    for (const [target, byProperty] of changes) {
      const values = state.get(target) ?? {};
      for (const [property, value] of byProperty) {
        const kind = kinds[property];
        const before = values[property];
        if (before !== undefined) {
          timeline = setKey(timeline, target, property, { t: start, value: before }, kind);
        }
        timeline = setKey(
          timeline,
          target,
          property,
          { t: end, value, ...(beat.ease !== undefined ? { easing: beat.ease } : {}) },
          kind,
        );
        values[property] = value;
      }
      state.set(target, values);
    }

    for (const id of beat.effects?.remove ?? []) {
      const span = open.get(id);
      if (!span) {
        throw new ScriptError(index, `unknown effect '${id}'.`);
      }
      span.end = start;
      open.delete(id);
    }
    for (const effect of beat.effects?.add ?? []) {
      if (open.has(effect.id)) {
        throw new ScriptError(index, `effect '${effect.id}' is already running.`);
      }
      const span = { effect, start, end: options.duration };
      effects.push(span);
      open.set(effect.id, span);
    }
    if (beat.caption !== undefined) {
      if (caption) {
        caption.end = start;
      }
      caption = beat.caption.length > 0 ? { text: beat.caption, start, end: options.duration } : undefined;
      if (caption) {
        captions.push(caption);
      }
    }
  });

  return { timeline, effects, captions };
};

/**
 * When each beat runs, in seconds into the shot: from its `at`, or from where the previous beat ended. Anything timed
 * by beats (keys, screen text) takes its times from here.
 */
export const beatTimes = (script: readonly Pick<Beat, 'at' | 'duration'>[]): { start: number; end: number }[] => {
  let cursor = 0;
  return script.map((beat) => {
    const start = beat.at ?? cursor;
    cursor = start + beat.duration;
    return { start, end: cursor };
  });
};

/** Every target a beat names. */
const mentioned = (beat: Beat<ScriptEffect>): string[] => [
  ...(beat.show ?? []),
  ...(beat.hide ?? []),
  ...Object.keys(beat.set ?? {}),
  ...(beat.layout?.targets ?? []),
  ...(beat.merge ? [...beat.merge.from, beat.merge.into] : []),
];
