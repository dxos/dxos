//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Type, View } from '@dxos/echo';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const DeleteCardFieldOutput = Schema.Struct({
  field: View.FieldSchema.annotate({ description: 'The deleted field schema.' }),
  props: Schema.Any.annotate({ description: 'The deleted field properties.' }),
  index: Schema.Number.annotate({ description: 'The index the field was at.' }),
});

export type DeleteCardFieldOutput = Schema.Schema.Type<typeof DeleteCardFieldOutput>;

export const DeleteCardField = Operation.make({
  meta: {
    key: makeKey('deleteCardField'),
    name: 'Delete Card Field',
    icon: 'ph--minus-circle--regular',
    tags: [OperationTag.Database],
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View),
    fieldId: Schema.String,
  }),
  output: DeleteCardFieldOutput,
});

export const DeleteCardOutput = Schema.Struct({
  card: Schema.Any.annotate({ description: 'The deleted card.' }),
});

export type DeleteCardOutput = Schema.Schema.Type<typeof DeleteCardOutput>;

export const DeleteCard = Operation.make({
  meta: { key: makeKey('deleteCard'), name: 'Delete Card', icon: 'ph--trash--regular', tags: [OperationTag.Database] },
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
    tags: [OperationTag.Database],
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View).annotate({ description: 'The view to restore the field to.' }),
    field: View.FieldSchema.annotate({ description: 'The field schema to restore.' }),
    props: Schema.Any.annotate({ description: 'The field properties to restore.' }),
    index: Schema.Number.annotate({ description: 'The index to restore the field at.' }),
  }),
  output: Schema.Void,
});

export const RestoreCard = Operation.make({
  meta: {
    key: makeKey('restoreCard'),
    name: 'Restore Card',
    icon: 'ph--clock-counter-clockwise--regular',
    tags: [OperationTag.Database],
  },
  input: Schema.Struct({
    card: Schema.Any.annotate({ description: 'The card to restore.' }),
  }),
  output: Schema.Void,
});
