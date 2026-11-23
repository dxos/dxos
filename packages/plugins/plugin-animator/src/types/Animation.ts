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
// Effect (PLUGIN.mdl `type Effect`).
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

export type MakeEffectProps = Pick<Effect, 'name' | 'description' | 'renderer' | 'source'> & {
  params: Readonly<Record<string, unknown>>;
};

/** A new Effect at version 1; the parameter schema is copied so the stored object owns it. */
export const makeEffect = ({ params, ...props }: MakeEffectProps): Effect =>
  Obj.make(Effect, { ...props, params: JSON.parse(JSON.stringify(params)), version: 1 });

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
  /** Replaces the caption on screen; an empty string clears it. Lines after the first fade in one by one. */
  caption: Schema.optional(Schema.String),
  /** An image (URL) shown as the caption's headline in place of its first line. */
  captionImage: Schema.optional(Schema.String),
  /** The caption's colour (CSS); white when unset. */
  captionColor: Schema.optional(Schema.String),
  /** Replaces the side title (large, middle left); an empty string clears it. */
  sideTitle: Schema.optional(Schema.String),
  /** A full-frame curtain from the beat's start: fades to `color` over `fade`, holds for `hold`, and fades back. */
  curtain: Schema.optional(
    Schema.Struct({
      color: Schema.optional(Schema.String),
      fade: Schema.optional(Schema.Number),
      hold: Schema.optional(Schema.Number),
    }),
  ),
});
export type Beat = Schema.Schema.Type<typeof Beat>;

export const ScreenTextKind = Schema.Literals(['caption', 'side-title', 'curtain']);
export type ScreenTextKind = Schema.Schema.Type<typeof ScreenTextKind>;

/**
 * Text or a curtain the animator draws above any stage from `at` for `duration` seconds (F-8.3, F-8.5): a caption
 * (a headline, or `image`, then lines that fade in `stagger` seconds apart), a side title, or a curtain in `color`.
 */
export const ScreenText = Schema.Struct({
  kind: ScreenTextKind,
  at: Schema.Number,
  duration: Schema.Number,
  /** Lines separated by newlines. */
  text: Schema.optional(Schema.String),
  image: Schema.optional(Schema.String),
  color: Schema.optional(Schema.String),
  /** Seconds to fade in and to fade out. */
  fade: Schema.optional(Schema.Number),
  /** Seconds between a caption's lines appearing. */
  stagger: Schema.optional(Schema.Number),
});
export type ScreenText = Schema.Schema.Type<typeof ScreenText>;

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
  /** Screen text placed by hand; a script's caption, side title and curtain beats add to it. */
  screen: Schema.optional(Schema.Array(ScreenText)),
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
