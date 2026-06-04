//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type, View, DXN } from '@dxos/echo';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

export const DeleteCardFieldOutput = Schema.Struct({
  field: View.FieldSchema.annotations({ description: 'The deleted field schema.' }),
  props: Schema.Any.annotations({ description: 'The deleted field properties.' }),
  index: Schema.Number.annotations({ description: 'The index the field was at.' }),
});

export type DeleteCardFieldOutput = Schema.Schema.Type<typeof DeleteCardFieldOutput>;

export const DeleteCardField = Operation.make({
  meta: {
    key: makeKey('deleteCardField'),
    name: 'Delete Card Field',
    icon: 'ph--minus-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View),
    fieldId: Schema.String,
  }),
  output: DeleteCardFieldOutput,
});

export const DeleteCardOutput = Schema.Struct({
  card: Schema.Any.annotations({ description: 'The deleted card.' }),
});

export type DeleteCardOutput = Schema.Schema.Type<typeof DeleteCardOutput>;

export const DeleteCard = Operation.make({
  meta: { key: makeKey('deleteCard'), name: 'Delete Card', icon: 'ph--trash--regular' },
  input: Schema.Struct({
    card: Schema.Any,
  }),
  output: DeleteCardOutput,
});

export const RestoreCardField = Operation.make({
  meta: {
    key: makeKey('restoreCardField'),
    name: 'Restore Card Field',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View).annotations({ description: 'The view to restore the field to.' }),
    field: View.FieldSchema.annotations({ description: 'The field schema to restore.' }),
    props: Schema.Any.annotations({ description: 'The field properties to restore.' }),
    index: Schema.Number.annotations({ description: 'The index to restore the field at.' }),
  }),
  output: Schema.Void,
});

export const RestoreCard = Operation.make({
  meta: {
    key: makeKey('restoreCard'),
    name: 'Restore Card',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    card: Schema.Any.annotations({ description: 'The card to restore.' }),
  }),
  output: Schema.Void,
});
