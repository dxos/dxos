//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, type JsonPath, type JsonSchemaType, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

export interface Table extends Entity.OfKind<typeof Entity.Kind.Object> {
  readonly name?: string;
  readonly view: Ref.Ref<View.View>;
  readonly sizes: Record<string, number>;
}

export interface TableEncoded {
  readonly id: string;
  readonly name?: string;
  readonly view: string;
  readonly sizes: Record<string, number>;
}

// Type annotation hides internal types while preserving brand properties.
export const Table: Type.Obj.Of<Schema.Schema<Table, TableEncoded>> = Schema.Struct({
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
) as any;

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
    const schema = Type.toEffectSchema(jsonSchema);
    const properties = SchemaAST.getPropertySignatures(schema.ast);
    for (const property of properties) {
      const name = property.name.toString() as JsonPath;
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
