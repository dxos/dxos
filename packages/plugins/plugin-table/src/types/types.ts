//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { View } from '@dxos/schema';

import { meta } from '../meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    }),
    Schema.optional,
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

export namespace TableAction {
  const TABLE_ACTION = `${meta.id}/action`;

  export class OnCreateSpace extends Schema.TaggedClass<OnCreateSpace>()(`${TABLE_ACTION}/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class OnSchemaAdded extends Schema.TaggedClass<OnSchemaAdded>()(`${TABLE_ACTION}/on-schema-added`, {
    input: Schema.Struct({
      db: Database.Database,
      // TODO(wittjosiah): Schema for schema?
      schema: Schema.Any,
      show: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Void,
  }) {}

  export class Create extends Schema.TaggedClass<Create>()(`${TABLE_ACTION}/create`, {
    input: Schema.extend(
      Schema.Struct({
        db: Database.Database,
      }),
      CreateTableSchema,
    ),
    output: Schema.Struct({
      object: Table.Table,
    }),
  }) {}

  export class AddRow extends Schema.TaggedClass<AddRow>()(`${TABLE_ACTION}/add-row`, {
    input: Schema.Struct({
      view: View.View,
      data: Schema.Any,
    }),
    output: Schema.Void,
  }) {}
}
