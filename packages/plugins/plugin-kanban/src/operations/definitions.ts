// Copyright 2025 DXOS.org

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { View } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const KANBAN_OPERATION = `${meta.id}.operation`;

export const DeleteCardFieldOutput = Schema.Struct({
  field: View.FieldSchema.annotations({ description: 'The deleted field schema.' }),
  props: Schema.Any.annotations({ description: 'The deleted field properties.' }),
  index: Schema.Number.annotations({ description: 'The index the field was at.' }),
});

export type DeleteCardFieldOutput = Schema.Schema.Type<typeof DeleteCardFieldOutput>;

export const DeleteCardField = Operation.make({
  meta: { key: `${KANBAN_OPERATION}.delete-card-field`, name: 'Delete Card Field' },
  services: [Capability.Service],
  input: Schema.Struct({
    view: View.View,
    fieldId: Schema.String,
  }),
  output: DeleteCardFieldOutput,
});

export const DeleteCardOutput = Schema.Struct({
  card: Schema.Any.annotations({ description: 'The deleted card.' }),
});

export type DeleteCardOutput = Schema.Schema.Type<typeof DeleteCardOutput>;

export const DeleteCard = Operation.make({
  meta: { key: `${KANBAN_OPERATION}.delete-card`, name: 'Delete Card' },
  input: Schema.Struct({
    card: Schema.Any,
  }),
  output: DeleteCardOutput,
});

export const RestoreCardField = Operation.make({
  meta: { key: `${KANBAN_OPERATION}.restore-card-field`, name: 'Restore Card Field' },
  services: [Capability.Service],
  input: Schema.Struct({
    view: View.View.annotations({ description: 'The view to restore the field to.' }),
    field: View.FieldSchema.annotations({ description: 'The field schema to restore.' }),
    props: Schema.Any.annotations({ description: 'The field properties to restore.' }),
    index: Schema.Number.annotations({ description: 'The index to restore the field at.' }),
  }),
  output: Schema.Void,
});

export const RestoreCard = Operation.make({
  meta: { key: `${KANBAN_OPERATION}.restore-card`, name: 'Restore Card' },
  input: Schema.Struct({
    card: Schema.Any.annotations({ description: 'The card to restore.' }),
  }),
  output: Schema.Void,
});
