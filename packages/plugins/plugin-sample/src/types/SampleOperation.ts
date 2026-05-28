//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

// Operation definitions declare the contract for plugin actions.
// Operations are the primary way plugins expose functionality to the framework,
// other plugins, and AI assistants. Each operation has typed input/output schemas.

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

// Convention: prefix all operation keys with the plugin's meta.id to avoid collisions.
const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

// `Operation.make` creates a typed operation definition.
// - `meta.key`: globally unique identifier used for routing and invocation.
// - `meta.name`: human-readable name used in UI and AI tool descriptions.
// - `input`: Effect/Schema defining the expected input shape.
// - `output`: Effect/Schema defining the return shape.
export const CreateSampleItem = Operation.make({
  meta: {
    key: makeKey('createSampleItem'),
    name: 'Create Sample Item',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ description: 'Display name for the item.' }),
  }),
  output: Schema.Struct({
    object: Schema.Any.annotations({ description: 'The created SampleItem object.' }),
  }),
});

export const Randomize = Operation.make({
  meta: { key: makeKey('randomize'), name: 'Randomize Sample Item', icon: 'ph--shuffle--regular' },
  input: Schema.Struct({
    item: Schema.Any.annotations({ description: 'The SampleItem to randomize.' }),
  }),
  output: Schema.Void,
});

export const UpdateStatus = Operation.make({
  meta: { key: makeKey('updateStatus'), name: 'Update Status', icon: 'ph--pencil--regular' },
  input: Schema.Struct({
    item: Schema.Any.annotations({ description: 'The SampleItem to update.' }),
    status: Schema.String.annotations({ description: 'The new status value.' }),
  }),
  output: Schema.Void,
});
