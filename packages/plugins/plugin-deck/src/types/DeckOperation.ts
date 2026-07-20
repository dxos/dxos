//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

const PartAdjustmentSchema = Schema.Union(
  Schema.Literal('close').annotations({ description: 'Close the plank.' }),
  Schema.Literal('companion').annotations({ description: 'Open the companion plank side-by-side.' }),
  Schema.Literal('fullscreen').annotations({ description: 'Toggle fullscreen display of the plank.' }),
  Schema.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
  Schema.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
);

export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;

export const Adjust = Operation.make({
  meta: {
    key: makeKey('adjust'),
    name: 'Adjust',
    description: 'Adjust the layout of a plank.',
    icon: 'ph--layout--regular',
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
    key: makeKey('updatePlankSize'),
    name: 'Update Plank Size',
    description: 'Update the size of a plank.',
    icon: 'ph--arrows-out--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    id: Schema.String.annotations({ description: 'The id of the plank to resize.' }),
    size: Schema.Number.annotations({ description: 'The new size of the plank.' }),
  }),
  output: Schema.Void,
});
