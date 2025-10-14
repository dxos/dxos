//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.String.pipe(
    Schema.annotations({
      [TypenameAnnotationId]: ['used-static', 'dynamic'],
    }),
    Schema.optional,
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

export namespace TableAction {
  const TABLE_ACTION = `${meta.id}/action`;

  export class onCreateSpace extends Schema.TaggedClass<onCreateSpace>()(`${TABLE_ACTION}/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class OnSchemaAdded extends Schema.TaggedClass<OnSchemaAdded>()(`${TABLE_ACTION}/on-schema-added`, {
    input: Schema.Struct({
      space: SpaceSchema,
      // TODO(wittjosiah): Schema for schema?
      schema: Schema.Any,
    }),
    output: Schema.Void,
  }) {}

  export class Create extends Schema.TaggedClass<Create>()(`${TABLE_ACTION}/create`, {
    input: Schema.extend(
      Schema.Struct({
        space: SpaceSchema,
      }),
      CreateTableSchema,
    ),
    output: Schema.Struct({
      object: DataType.View,
    }),
  }) {}

  export class AddRow extends Schema.TaggedClass<AddRow>()(`${TABLE_ACTION}/add-row`, {
    input: Schema.Struct({
      view: DataType.View,
      data: Schema.Any,
    }),
    output: Schema.Void,
  }) {}
}
