//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// QueryAST is referenced indirectly through `Type.InstanceType<typeof TableSchema>`
// (Ref.Ref(View.View) → View.View → QueryAST.Query) in the emitted .d.ts; the
// namespace import keeps the inferred types portable.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Annotation, DXN, JsonSchema, Obj, QueryAST, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type JsonSchema as JsonSchemaType } from '@dxos/echo/JsonSchema';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { ViewAnnotation } from '@dxos/schema';

// TODO(wittjosiah): Try to clean up this type inference.
export class Table extends Type.makeObject<Table>(DXN.make('org.dxos.type.table', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),

    view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false)),

    // TODO(wittjosiah): Key should be JsonPath.
    sizes: Schema.Record(Schema.String, Schema.Number).pipe(Schema.mutableKey, FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    ViewAnnotation.set(['view']),
    Annotation.IconAnnotation.set({ icon: 'ph--table--regular', hue: 'green' }),
  ),
) {}

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
  // Preset sizes are computed before construction: Effect 4 records are readonly at the type level,
  // so the defaults go in as initial props rather than being assigned onto the live object.
  const initialSizes: Record<string, number> = { ...sizes };
  if (jsonSchema) {
    const schema = JsonSchema.toEffectSchema(jsonSchema);
    for (const property of SchemaAST.getPropertySignatures(schema.ast)) {
      const name = property.name.toString() as SchemaEx.JsonPath;
      if (initialSizes[name] !== undefined) {
        continue;
      }

      // A plain switch rather than `Match.when({ _tag })`: matching an object pattern against
      // Effect 4's mutually recursive AST union expands into a mapped type the checker cannot resolve.
      switch (property.type._tag) {
        case 'Boolean':
        case 'Number':
          initialSizes[name] = 100;
          break;
      }
    }
  }

  return Obj.make(Table, { name, view: Ref.make(view), sizes: initialSizes } as Obj.MakeProps<typeof Table>);
};
