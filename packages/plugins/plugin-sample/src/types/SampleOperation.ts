//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

// Operation definitions declare the contract for plugin actions.
// Operations are the primary way plugins expose functionality to the framework,
// other plugins, and AI assistants. Each operation has typed input/output schemas.

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

// Convention: `<root>.operation.<domain>.<verb>`, written in full so a key can be found by searching for it.

// `Operation.make` creates a typed operation definition.
// - `meta.key`: globally unique identifier used for routing and invocation.
// - `meta.name`: human-readable name used in UI and AI tool descriptions.
// - `input`: Effect/Schema defining the expected input shape.
// - `output`: Effect/Schema defining the return shape.
export const CreateSampleItem = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sample.createItem'),
    name: 'Create Sample Item',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({ description: 'Display name for the item.' }),
  }),
  output: Schema.Struct({
    object: Schema.Any.annotate({ description: 'The created SampleItem object.' }),
  }),
});

export const Randomize = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sample.randomize'),
    name: 'Randomize Sample Item',
    icon: 'ph--shuffle--regular',
  },
  input: Schema.Struct({
    item: Schema.Any.annotate({ description: 'The SampleItem to randomize.' }),
  }),
  output: Schema.Void,
});

export const UpdateStatus = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sample.updateStatus'),
    name: 'Update Status',
    icon: 'ph--pencil--regular',
  },
  input: Schema.Struct({
    item: Schema.Any.annotate({ description: 'The SampleItem to update.' }),
    status: Schema.String.annotate({ description: 'The new status value.' }),
  }),
  output: Schema.Void,
});
