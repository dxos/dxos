//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Easing, Timeline, Track } from '@dxos/animation';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';

/** The frame rate an animation exports at unless it says otherwise. */
export const DEFAULT_FPS = 30;

/** The length of a new shot, in seconds. */
export const DEFAULT_SHOT_DURATION = 5;

//
// Effect (PLUGIN.mdl `type Effect`); schema only until the effect operations land (Phase 3).
//

export const EffectRenderer = Schema.Literals(['2d', '3d', 'overlay']);
export type EffectRenderer = Schema.Schema.Type<typeof EffectRenderer>;

/** Agent-written code that draws what keys cannot; run sandboxed and deterministically (DESIGN.md §6). */
export class Effect extends Type.makeObject<Effect>(DXN.make('org.dxos.type.animator.effect', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    renderer: EffectRenderer,
    source: Schema.String,
    /** JSON schema of the parameters; bindings via `x-binding`. */
    params: Schema.Record(Schema.String, Schema.Any),
    version: Schema.Number,
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--sparkle--regular', hue: 'violet' }),
  ),
) {}

/** An effect placed in a shot with its parameters. */
export const EffectInstance = Schema.Struct({
  id: Schema.String,
  effect: Ref.Ref(Effect),
  params: Schema.Record(Schema.String, Schema.Any),
  seed: Schema.optional(Schema.Number),
});
export type EffectInstance = Schema.Schema.Type<typeof EffectInstance>;

//
// Shots.
//

/** One state in a declarative shot script (DESIGN.md §5.3); `@dxos/animation`'s `compileScript` compiles it. */
export const Beat = Schema.Struct({
  at: Schema.optional(Schema.Number),
  duration: Schema.Number,
  ease: Schema.optional(Easing),
  show: Schema.optional(Schema.Array(Schema.String)),
  hide: Schema.optional(Schema.Array(Schema.String)),
  set: Schema.optional(Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Any))),
  layout: Schema.optional(
    Schema.Struct({
      kind: Schema.String,
      targets: Schema.Array(Schema.String),
      params: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
    }),
  ),
  merge: Schema.optional(Schema.Struct({ from: Schema.Array(Schema.String), into: Schema.String })),
  camera: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  effects: Schema.optional(
    Schema.Struct({
      add: Schema.optional(Schema.Array(EffectInstance)),
      remove: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
  caption: Schema.optional(Schema.String),
});
export type Beat = Schema.Schema.Type<typeof Beat>;

export const TransitionKind = Schema.Literals(['cut', 'fade', 'dissolve']);
export type TransitionKind = Schema.Schema.Type<typeof TransitionKind>;

/** How a shot enters from the one before it. */
export const Transition = Schema.Struct({ kind: TransitionKind, duration: Schema.Number });
export type Transition = Schema.Schema.Type<typeof Transition>;

export const Marker = Schema.Struct({
  t: Schema.Number,
  label: Schema.String,
  caption: Schema.optional(Schema.String),
});
export type Marker = Schema.Schema.Type<typeof Marker>;

/** One stage object played for a duration; where a hand key and a compiled script key meet, the hand key wins. */
export const Shot = Schema.Struct({
  id: Schema.String,
  /** The object a stage renders: a canvas scene, a 3D scene. */
  stage: Ref.Ref(Obj.Unknown),
  /** Seconds. */
  duration: Schema.Number,
  /** Hand-placed keys; tracks keyed by `${target}:${property}`, the camera's under the `camera` target. */
  timeline: Timeline,
  script: Schema.optional(Schema.Array(Beat)),
  /** A camera track whose values are records of camera properties, in the shape the stage owns. */
  camera: Schema.optional(Track),
  effects: Schema.Array(EffectInstance),
  transition: Schema.optional(Transition),
  markers: Schema.optional(Schema.Array(Marker)),
});
export type Shot = Schema.Schema.Type<typeof Shot>;

export const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size = Schema.Schema.Type<typeof Size>;

/** A film made of shots played one after another, each over an object some stage renders. */
export class Animation extends Type.makeObject<Animation>(DXN.make('org.dxos.type.animator.animation', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** The export rate; playback samples by time at the display's rate. */
    fps: Schema.Number,
    /** The export frame size in pixels. */
    size: Schema.optional(Size),
    shots: Schema.Array(Shot),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--film-strip--regular', hue: 'violet' }),
    Annotation.UserType.set(),
  ),
) {}

/**
 * A shot over `stage` with an empty timeline. Its type is left to inference, which fits both a `Shot` and the writable
 * form an `Obj.update` draft takes, so it can be pushed onto a stored animation.
 */
export const makeShot = (stage: Ref.Ref<Obj.Unknown>, duration = DEFAULT_SHOT_DURATION) => ({
  id: Obj.ID.random(),
  stage,
  duration,
  timeline: { duration, tracks: {} },
  effects: [],
});

export type MakeProps = { name?: string; fps?: number; size?: Size; stages?: readonly Ref.Ref<Obj.Unknown>[] };

/** An animation with one empty shot per stage. */
export const make = ({ name, fps = DEFAULT_FPS, size, stages = [] }: MakeProps = {}): Animation =>
  Obj.make(Animation, {
    name,
    fps,
    ...(size ? { size } : {}),
    shots: stages.map((stage) => makeShot(stage)),
  });
