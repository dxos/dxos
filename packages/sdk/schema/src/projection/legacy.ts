//
// Copyright 2024 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { defineObjectMigration } from '@dxos/echo-db';
import { FieldSortType, JsonSchemaType, QueryType, TypedObject } from '@dxos/echo-schema';

import { FieldSchema, KeyValueProps } from './field';
import { Projection } from './projection';

// TODO(wittjosiah): Refactor to organize better previous versions + migrations.

export class ViewTypeV1 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  name: Schema.String.annotations({
    title: 'Name',
    [SchemaAST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: Schema.Struct({
    type: Schema.optional(Schema.String),
    sort: Schema.optional(Schema.Array(FieldSortType)),
  }).pipe(Schema.mutable),
  schema: Schema.optional(JsonSchemaType),
  fields: Schema.mutable(Schema.Array(FieldSchema)),
  metadata: Schema.optional(KeyValueProps.pipe(Schema.mutable)),
}) {}

export class ViewTypeV2 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.2.0',
})({
  name: Schema.String.annotations({
    title: 'Name',
    [SchemaAST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: QueryType,
  schema: Schema.optional(JsonSchemaType),
  fields: Schema.mutable(Schema.Array(FieldSchema)),
  hiddenFields: Schema.optional(Schema.mutable(Schema.Array(FieldSchema))),
  metadata: Schema.optional(KeyValueProps.pipe(Schema.mutable)),
}) {}

export const ViewTypeV1ToV2 = defineObjectMigration({
  from: ViewTypeV1,
  to: ViewTypeV2,
  transform: async (from) => {
    return {
      ...from,
      query: {
        typename: from.query.type,
      },
    };
  },
  onMigration: async () => {},
});

export const ViewTypeToProjection = defineObjectMigration({
  from: ViewTypeV1,
  to: Projection,
  transform: async (from) => {
    return from;
  },
  onMigration: async () => {},
});
