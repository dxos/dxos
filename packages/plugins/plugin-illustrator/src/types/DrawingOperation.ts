//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Operation } from '@dxos/compute';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';
import { Scene } from '#model';

import * as Drawing from './Drawing';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Drawing', icon: 'ph--pencil-simple--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    variant: Schema.optional(Schema.String).annotations({
      description: 'Variant id (canvas typename); defaults to the first registered variant.',
    }),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Drawing.Drawing),
  }),
  services: [Capability.Service, Database.Service],
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
    name: 'Read Drawing',
    description:
      'Returns the current scene of a drawing: world objects (by id) with their elements in object-local units. Call before editing an existing drawing.',
    icon: 'ph--eye--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotations({ description: 'The drawing to read.' }),
  }),
  output: Schema.Struct(SceneOutput),
  services: [Capability.Service, Database.Service],
});

export const Edit = Operation.make({
  meta: {
    key: makeKey('edit'),
    name: 'Edit Drawing',
    description:
      'Applies scene commands to a drawing: upsert/move/remove world objects or individual elements by id. Returns the resulting scene.',
    icon: 'ph--pencil-simple-line--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotations({ description: 'The drawing to edit.' }),
    commands: Schema.Array(Scene.Command).annotations({ description: 'Commands applied in order, atomically.' }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotations({ description: 'Object ids created or modified.' }),
    removed: Schema.Number.annotations({ description: 'Number of shapes removed.' }),
  }),
  services: [Capability.Service, Database.Service],
});

export const Generate = Operation.make({
  meta: {
    key: makeKey('generate'),
    name: 'Generate Drawing',
    description:
      'Replaces a drawing with a diagram compiled from a mermaid flowchart description. The dialect owns layout, so no coordinates are supplied.',
    icon: 'ph--graph--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotations({ description: 'The drawing to generate into.' }),
    source: Schema.String.annotations({ description: 'Mermaid flowchart source.' }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotations({ description: 'Object ids created or modified.' }),
  }),
  services: [Capability.Service, Database.Service],
});
