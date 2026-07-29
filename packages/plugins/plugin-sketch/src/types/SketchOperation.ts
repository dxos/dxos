//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';
import { Scene } from '#model';

import * as Sketch from './Sketch';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Sketch', icon: 'ph--pencil-simple--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    schema: Schema.optional(Schema.String),
    content: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Sketch.Sketch),
  }),
});

/** The scene as derived from the live canvas. */
const SceneOutput = {
  scene: Scene.Scene.annotations({ description: 'The diagram as world objects with object-local coordinates.' }),
  unmanaged: Schema.Number.annotations({
    description: 'Number of shapes on the canvas not managed by the DSL (drawn by users).',
  }),
};

export const Read = Operation.make({
  meta: {
    key: makeKey('read'),
    name: 'Read Sketch',
    description:
      'Returns the current scene of a sketch: world objects (by id) with their elements in object-local units. Call before editing an existing sketch.',
    icon: 'ph--eye--regular',
  },
  input: Schema.Struct({
    sketch: Ref.Ref(Sketch.Sketch).annotations({ description: 'The sketch to read.' }),
  }),
  output: Schema.Struct(SceneOutput),
  services: [Database.Service],
});

export const Edit = Operation.make({
  meta: {
    key: makeKey('edit'),
    name: 'Edit Sketch',
    description:
      'Applies scene commands to a sketch: upsert/move/remove world objects or individual elements by id. Returns the resulting scene.',
    icon: 'ph--pencil-simple-line--regular',
  },
  input: Schema.Struct({
    sketch: Ref.Ref(Sketch.Sketch).annotations({ description: 'The sketch to edit.' }),
    commands: Schema.Array(Scene.Command).annotations({ description: 'Commands applied in order, atomically.' }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotations({ description: 'Object ids created or modified.' }),
    removed: Schema.Number.annotations({ description: 'Number of shapes removed.' }),
  }),
  services: [Database.Service],
});
