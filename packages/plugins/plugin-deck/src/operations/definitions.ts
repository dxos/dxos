//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';

const PartAdjustmentSchema = Schema.Union(
  Schema.Literal('close').annotations({ description: 'Close the plank.' }),
  Schema.Literal('companion').annotations({ description: 'Open the companion plank.' }),
  Schema.Literal('solo').annotations({ description: 'Solo the plank.' }),
  Schema.Literal('solo--fullscreen').annotations({ description: 'Fullscreen the plank.' }),
  Schema.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
  Schema.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
);
export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;

export const Adjust = Operation.make({
  meta: {
    key: `${meta.id}.operation.adjust`,
    name: 'Adjust',
    description: 'Adjust the layout of a plank.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    id: Schema.String.annotations({ description: 'The id of the plank to adjust.' }),
    type: PartAdjustmentSchema.annotations({ description: 'The type of adjustment to make.' }),
  }),
  output: Schema.Void,
});

export const UpdatePlankSize = Operation.make({
  meta: {
    key: `${meta.id}.operation.update-plank-size`,
    name: 'Update Plank Size',
    description: 'Update the size of a plank.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    id: Schema.String.annotations({ description: 'The id of the plank to resize.' }),
    size: Schema.Number.annotations({ description: 'The new size of the plank.' }),
  }),
  output: Schema.Void,
});

export const ChangeCompanion = Operation.make({
  meta: {
    key: `${meta.id}.operation.change-companion`,
    name: 'Change Companion',
    description: 'Change the companion plank for a primary plank.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    companion: Schema.Union(Schema.String, Schema.Null),
  }),
  output: Schema.Void,
});
