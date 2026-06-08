//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

// QueryAST is referenced indirectly through `Type.InstanceType<typeof TableSchema>`
// (Ref.Ref(View.View) → View.View → QueryAST.Query) in the emitted .d.ts; the
// namespace import keeps the inferred types portable.
// eslint-disable-next-line unused-imports/no-unused-imports
import { DXN, Annotation, JsonSchema, Obj, QueryAST, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, type JsonSchemaType, LabelAnnotation } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { ViewAnnotation } from '@dxos/schema';

const TableSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  sizes: Schema.Record({
    // TODO(wittjosiah): Should be JsonPath.
    key: Schema.String,
    value: Schema.Number,
  }).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(['view']),
  Annotation.IconAnnotation.set({ icon: 'ph--table--regular', hue: 'green' }),
  Type.makeObject(DXN.make('org.dxos.type.table', '0.1.0')),
);

// TODO(wittjosiah): Try to clean up this type inference.
export interface Table extends Type.InstanceType<typeof TableSchema> {}
export const Table = TableSchema;

type MakeProps = {
  name?: string;
  sizes?: Record<string, number>;
  view: View.View;
  /** Required to auto-size columns. */
  jsonSchema?: JsonSchemaType;
};

/**
 * Make a table as a view of a data set.
 */
export const make = ({ name, sizes = {}, view, jsonSchema }: MakeProps): Table => {
  const table = Obj.make(Table, { name, view: Ref.make(view), sizes } as Obj.MakeProps<typeof Table>);

  // Preset sizes.
  if (jsonSchema) {
    const schema = JsonSchema.toEffectSchema(jsonSchema);
    const properties = SchemaAST.getPropertySignatures(schema.ast);
    for (const property of properties) {
      const name = property.name.toString() as SchemaEx.JsonPath;
      if (sizes?.[name]) {
        table.sizes[name] = sizes[name];
        continue;
      }

      Match.type<SchemaAST.AST>().pipe(
        Match.when({ _tag: 'BooleanKeyword' }, () => {
          table.sizes[name] = 100;
        }),
        Match.when({ _tag: 'NumberKeyword' }, () => {
          table.sizes[name] = 100;
        }),
        Match.orElse(() => {
          // Noop.
        }),
      )(property.type);
    }
  }

  return table;
};
