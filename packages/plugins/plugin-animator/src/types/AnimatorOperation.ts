//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Data from 'effect/Data';
import * as Schema from 'effect/Schema';

import { Easing } from '@dxos/animation';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref } from '@dxos/echo';

import * as Animation from './Animation.ts';

/** A key or script names a target, property or effect the shot's stage does not have. */
export class UnknownTargetError extends Data.TaggedError('UnknownTargetError')<{ message: string }> {}

/** The animation has no shot of the id an operation named. */
export class UnknownShotError extends Data.TaggedError('UnknownShotError')<{ message: string }> {}

/** A script beat names an unknown target, layout or effect; `beat` is its index. */
export class ScriptError extends Data.TaggedError('ScriptError')<{ message: string; beat: number }> {}

/** The shot's stage cannot draw the effect's renderer. */
export class RendererError extends Data.TaggedError('RendererError')<{ message: string }> {}

export const CreateAnimation = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.createAnimation'),
    name: 'Create animation',
    description: 'Creates an Animation with one shot per given stage object, each with an empty timeline.',
    icon: 'ph--film-strip--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    stages: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
      description: 'The objects the shots play, in order: canvas drawings, 3D scenes.',
    }),
    fps: Schema.optional(Schema.Number.annotate({ description: 'The export frame rate.' })),
  }),
  output: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
  }),
  services: [Database.Service],
});

export const SetKey = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.setKey'),
    name: 'Set key',
    description:
      'Keys a target property, an effect parameter or the camera at a time in a shot. The path is `<target>:<property>` (a property the stage lists as animatable), `effect:<instance>:<param>` or `camera:<property>`.',
    icon: 'ph--diamond--regular',
  },
  input: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    shot: Schema.String.annotate({ description: 'The shot id.' }),
    t: Schema.Number.annotate({ description: 'Seconds into the shot.' }),
    path: Schema.String.annotate({
      description: 'The keyed path: `<target>:<property>`, `effect:<instance>:<param>` or `camera:<property>`.',
    }),
    value: Schema.Any,
    ease: Schema.optional(Easing.annotate({ description: 'Shapes the span that ends at this key.' })),
  }),
  output: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    keys: Schema.Number.annotate({ description: 'Keys now on the track.' }),
  }),
  services: [Database.Service, Capability.Service],
});

export const SetScript = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.setScript'),
    name: 'Set script',
    description:
      "Replaces a shot's declarative script (a list of beats: show, hide, set, layout, merge, camera, caption) and compiles it against the shot's stage, failing with the first beat that names an unknown target, layout or effect.",
    icon: 'ph--list-numbers--regular',
  },
  input: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    shot: Schema.String.annotate({ description: 'The shot id.' }),
    script: Schema.Array(Animation.Beat),
  }),
  output: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    keys: Schema.Number.annotate({ description: 'Keys the script compiled to.' }),
  }),
  services: [Database.Service, Capability.Service],
});

const EffectParams = Schema.Record(Schema.String, Schema.Any);

const CompileErrors = Schema.optional(
  Schema.Array(Schema.String).annotate({ description: 'Compile or load errors; absent when the source compiled.' }),
);

export const CreateEffect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.createEffect'),
    name: 'Create effect',
    description:
      "Writes a new Effect: one TypeScript module whose default export is `defineEffect({ sample(ctx) })` or `defineEffect({ init, step, draw })`, imported from '@dxos/plugin-animator/effect' (the only import allowed). `ctx` has t, dt, random, seed, renderer, params, duration, objects, links and bound (parameters marked `x-binding: 'object' | 'link'`, resolved). It returns `2d` shapes, `3d` instances or `overlay` items. Compiles it and returns compile errors.",
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    renderer: Animation.EffectRenderer,
    source: Schema.String.annotate({ description: 'The TypeScript module.' }),
    params: EffectParams.annotate({ description: 'JSON schema of the parameters; bindings via `x-binding`.' }),
  }),
  output: Schema.Struct({
    effect: Ref.Ref(Animation.Effect),
    version: Schema.Number,
    errors: CompileErrors,
  }),
  services: [Database.Service],
});

export const UpdateEffect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.updateEffect'),
    name: 'Update effect',
    description: "Replaces an Effect's source, parameter schema or description, bumps its version, and recompiles.",
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    effect: Ref.Ref(Animation.Effect),
    source: Schema.optional(Schema.String),
    params: Schema.optional(EffectParams),
    description: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    effect: Ref.Ref(Animation.Effect),
    version: Schema.Number,
    errors: CompileErrors,
  }),
  services: [Database.Service],
});

export const EffectReport = Schema.Struct({
  errors: CompileErrors,
  status: Schema.optional(
    Schema.Struct({
      state: Schema.Literals(['running', 'paused']),
      reason: Schema.optional(Schema.String),
      message: Schema.optional(Schema.String),
    }),
  ),
  timing: Schema.optional(Schema.Struct({ meanMs: Schema.Number, budgetMs: Schema.Number })),
  deterministic: Schema.optional(
    Schema.Boolean.annotate({ description: 'Each time gave the same frame reached forward and backward.' }),
  ),
  mismatch: Schema.optional(Schema.Number.annotate({ description: 'The first time the two runs differed at.' })),
  frames: Schema.optional(
    Schema.Array(Schema.Struct({ t: Schema.Number, items: Schema.Number, summary: Schema.String })),
  ),
});
export type EffectReport = Schema.Schema.Type<typeof EffectReport>;

export const CheckEffect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.checkEffect'),
    name: 'Check effect',
    description:
      "Runs an Effect headless over a duration with given parameters and reports step timings, a determinism check (each time reached forward and backward, so from different checkpoints) and what each frame drew. Binds to the given shot's stage, or to a ring of four linked objects `a` to `d`.",
    icon: 'ph--test-tube--regular',
  },
  input: Schema.Struct({
    effect: Ref.Ref(Animation.Effect),
    params: EffectParams,
    duration: Schema.Number.annotate({ description: 'Seconds to run over.' }),
    animation: Schema.optional(Ref.Ref(Animation.Animation)),
    shot: Schema.optional(Schema.String.annotate({ description: 'A shot whose stage to bind to.' })),
    seed: Schema.optional(Schema.Number),
  }),
  output: EffectReport,
  services: [Database.Service, Capability.Service],
});

export const PlaceEffect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.placeEffect'),
    name: 'Place effect',
    description:
      "Adds an Effect to a shot for the shot's whole length, with parameters (bindings name the stage's object or link ids; an unset binding binds all) and an optional seed. Fails when the shot's stage cannot draw the effect's renderer.",
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    shot: Schema.String.annotate({ description: 'The shot id.' }),
    effect: Ref.Ref(Animation.Effect),
    params: EffectParams,
    seed: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    animation: Ref.Ref(Animation.Animation),
    instance: Schema.String.annotate({ description: 'The placed instance id, for `effect:<instance>:<param>` keys.' }),
  }),
  services: [Database.Service, Capability.Service],
});

export const InstallEffects = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.animator.installEffects'),
    name: 'Install effects',
    description:
      'Adds the built-in effects (packet flow, burst, conversations, callout) to the space as Effect objects, skipping any already there by name, and returns them all.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    effects: Schema.Array(Ref.Ref(Animation.Effect)),
  }),
  services: [Database.Service],
});
