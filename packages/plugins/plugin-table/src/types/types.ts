//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { EchoSchema } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.String.annotations({
    [TypenameAnnotationId]: ['limited-static', 'dynamic'],
  }),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

export namespace TableAction {
  const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

  export class OnSchemaAdded extends Schema.TaggedClass<OnSchemaAdded>()(`${TABLE_ACTION}/on-schema-added`, {
    input: Schema.Struct({
      space: SpaceSchema,
      schema: Schema.instanceOf(EchoSchema),
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
