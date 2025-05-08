//
// Copyright 2023 DXOS.org
//

import { isInstanceOf, S } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';
import { FieldSchema } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

// TODO(burdon): Factor out (should be in common for Table, Kanban, and Map). Move to FormatEnum or SDK.
export const TypenameAnnotationId = Symbol.for('@dxos/plugin-table/annotation/Typename');

export const CreateTableSchema = S.Struct({
  name: S.optional(S.String),
  typename: S.optional(
    S.String.annotations({
      [TypenameAnnotationId]: true,
    }),
  ),
});

export type CreateTableType = S.Schema.Type<typeof CreateTableSchema>;

export namespace TableAction {
  const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${TABLE_ACTION}/create`, {
    input: S.extend(
      S.Struct({
        space: SpaceSchema,
      }),
      CreateTableSchema,
    ),
    output: S.Struct({
      object: TableType,
    }),
  }) {}

  export class DeleteColumn extends S.TaggedClass<DeleteColumn>()(`${TABLE_ACTION}/delete-column`, {
    input: S.Struct({
      table: TableType,
      fieldId: S.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: S.optional(
        S.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: S.Any,
          index: S.Number,
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class AddRow extends S.TaggedClass<AddRow>()(`${TABLE_ACTION}/add-row`, {
    input: S.Struct({
      table: TableType,
      data: S.Any,
    }),
    output: S.Void,
  }) {}
}

export const isTable = (object: unknown): object is TableType => isInstanceOf(TableType, object);
