//
// Copyright 2025 DXOS.org
//

// Operation definitions declare the contract for plugin actions.
// Operations are the primary way plugins expose functionality to the framework,
// other plugins, and AI assistants. Each operation has typed input/output schemas.

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '#meta';

// Convention: prefix all operation keys with the plugin's meta.id to avoid collisions.
const EXEMPLAR_OPERATION = `${meta.id}.operation`;

// `Operation.make` creates a typed operation definition.
// - `meta.key`: globally unique identifier used for routing and invocation.
// - `meta.name`: human-readable name used in UI and AI tool descriptions.
// - `input`: Effect/Schema defining the expected input shape.
// - `output`: Effect/Schema defining the return shape.
export const CreateExemplarItem = Operation.make({
  meta: { key: `${EXEMPLAR_OPERATION}.create-exemplar-item`, name: 'Create Exemplar Item' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ description: 'Display name for the item.' }),
  }),
  output: Schema.Struct({
    object: Schema.Any.annotations({ description: 'The created ExemplarItem object.' }),
  }),
});

export const Randomize = Operation.make({
  meta: { key: `${EXEMPLAR_OPERATION}.randomize`, name: 'Randomize Exemplar Item' },
  input: Schema.Struct({
    item: Schema.Any.annotations({ description: 'The ExemplarItem to randomize.' }),
  }),
  output: Schema.Void,
});

export const UpdateStatus = Operation.make({
  meta: { key: `${EXEMPLAR_OPERATION}.update-status`, name: 'Update Status' },
  input: Schema.Struct({
    item: Schema.Any.annotations({ description: 'The ExemplarItem to update.' }),
    status: Schema.String.annotations({ description: 'The new status value.' }),
  }),
  output: Schema.Void,
});
