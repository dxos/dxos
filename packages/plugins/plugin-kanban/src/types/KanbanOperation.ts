//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Type, View } from '@dxos/echo';

export const DeleteCardFieldOutput = Schema.Struct({
  field: View.FieldSchema.annotate({ description: 'The deleted field schema.' }),
  props: Schema.Any.annotate({ description: 'The deleted field properties.' }),
  index: Schema.Number.annotate({ description: 'The index the field was at.' }),
});

export type DeleteCardFieldOutput = Schema.Schema.Type<typeof DeleteCardFieldOutput>;

export const DeleteCardField = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.kanban.deleteCardField'),
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
  card: Schema.Any.annotate({ description: 'The deleted card.' }),
});

export type DeleteCardOutput = Schema.Schema.Type<typeof DeleteCardOutput>;

export const DeleteCard = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.kanban.deleteCard'),
    name: 'Delete Card',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    card: Schema.Any,
  }),
  output: DeleteCardOutput,
});

export const RestoreCardField = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.kanban.restoreCardField'),
    name: 'Restore Card Field',
    icon: 'ph--clock-counter-clockwise--regular',
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
    key: DXN.make('org.dxos.operation.kanban.restoreCard'),
    name: 'Restore Card',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    card: Schema.Any.annotate({ description: 'The card to restore.' }),
  }),
  output: Schema.Void,
});
