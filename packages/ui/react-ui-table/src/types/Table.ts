//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { type JsonPath, LabelAnnotation, toEffectSchema } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';
import { View, ViewAnnotation, getSchemaProperties } from '@dxos/schema';

const TableSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Type.Ref(View.View),

  sizes: Schema.Record({
    // TODO(wittjosiah): Should be JsonPath.
    key: Schema.String,
    value: Schema.Number,
  }).pipe(Schema.mutable),
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

type MakeWithViewProps = Omit<Partial<Obj.MakeProps<typeof Table>>, 'view'> & {
  view: View.View;
};

/**
 * Make a table with an existing view.
 */
export const makeWithView = ({ view, ...props }: MakeWithViewProps): Table =>
  Obj.make(Table, { sizes: {}, view: Ref.make(view), ...props });

type MakeProps = Partial<Omit<Obj.MakeProps<typeof Table>, 'view'>> & View.MakeFromSpaceProps;

export const make = async ({ name, sizes, ...props }: MakeProps): Promise<Table> => {
  const { jsonSchema, view } = await View.makeFromSpace(props);
  const table = Obj.make(Table, { name, view: Ref.make(view), sizes: {} });

  // Preset sizes.
  const schema = toEffectSchema(jsonSchema);
  const shouldIncludeId = props.fields?.find((field) => field === 'id') !== undefined;
  const properties = getSchemaProperties(schema.ast, {}, shouldIncludeId);
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

  return table;
};
