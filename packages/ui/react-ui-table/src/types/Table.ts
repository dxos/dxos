//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, type JsonPath, type JsonSchemaType, LabelAnnotation } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';
import { View, ViewAnnotation, getSchemaProperties } from '@dxos/schema';

const TableSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  sizes: Schema.Record({
    // TODO(wittjosiah): Should be JsonPath.
    key: Schema.String,
    value: Schema.Number,
  }).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Table',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
export interface Table extends Schema.Schema.Type<typeof TableSchema> {}
export interface TableEncoded extends Schema.Schema.Encoded<typeof TableSchema> {}
export const Table: Schema.Schema<Table, TableEncoded> = TableSchema;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Table>>, 'view'> & {
  view: View.View;
  /** Required to auto-size columns. */
  jsonSchema?: JsonSchemaType;
};

/**
 * Make a table as a view of a data set.
 */
export const make = ({ name, sizes = {}, view, jsonSchema }: MakeProps): Table => {
  const table = Obj.make(Table, { name, view: Ref.make(view), sizes });

  // Preset sizes.
  if (jsonSchema) {
    const schema = Type.toEffectSchema(jsonSchema);
    const properties = getSchemaProperties(schema.ast, {});
    for (const property of properties) {
      if (sizes?.[property.name]) {
        table.sizes[property.name] = sizes[property.name];
        continue;
      }

      Match.type<SimpleType>().pipe(
        Match.when('boolean', () => {
          table.sizes[property.name as JsonPath] = 100;
        }),
        Match.when('number', () => {
          table.sizes[property.name as JsonPath] = 100;
        }),
        Match.orElse(() => {
          // Noop.
        }),
      )(property.type);
    }
  }

  return table;
};

//
// V1
//

export const TableV1 = Schema.Struct({
  sizes: Schema.Record({
    key: Schema.String,
    value: Schema.Number,
  }).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Table',
    version: '0.1.0',
  }),
);
