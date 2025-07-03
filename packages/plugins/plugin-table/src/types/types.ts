//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Obj } from '@dxos/echo';
import { SpaceSchema } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';
import { FieldSchema, TypenameAnnotationId } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['limited-static', 'dynamic'],
    }),
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

export namespace TableAction {
  const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${TABLE_ACTION}/create`, {
    input: Schema.extend(
      Schema.Struct({
        space: SpaceSchema,
      }),
      CreateTableSchema,
    ),
    output: Schema.Struct({
      object: TableType,
    }),
  }) {}

  export class DeleteColumn extends Schema.TaggedClass<DeleteColumn>()(`${TABLE_ACTION}/delete-column`, {
    input: Schema.Struct({
      table: TableType,
      fieldId: Schema.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: Schema.optional(
        Schema.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: Schema.Any,
          index: Schema.Number,
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class AddRow extends Schema.TaggedClass<AddRow>()(`${TABLE_ACTION}/add-row`, {
    input: Schema.Struct({
      table: TableType,
      data: Schema.Any,
    }),
    output: Schema.Void,
  }) {}
}

export const isTable = (object: unknown): object is TableType => Obj.instanceOf(TableType, object);
