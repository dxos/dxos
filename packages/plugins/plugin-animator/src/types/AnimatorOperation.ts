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
