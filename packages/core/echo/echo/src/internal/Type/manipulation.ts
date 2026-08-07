//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { SchemaAST } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
export const addFieldsToSchema = (schema: Schema.Top, fields: Schema.Struct.Fields): Schema.Top => {
  const schemaExtension = Schema.Struct(fields).mapFields(Struct.map(Schema.optional));
  return schema.mapFields(Struct.assign(schemaExtension.fields)).annotate(schema.ast.annotations) as any as Schema.Top;
};

export const updateFieldsInSchema = (schema: Schema.Top, fields: Schema.Struct.Fields): Schema.Top => {
  const ast = schema.ast as SchemaAST.TypeLiteral;
  invariant(SchemaAST.isTypeLiteral(ast));

  const updatedProperties = [...ast.propertySignatures];
  const propertiesToUpdate = (Schema.Struct(fields).mapFields(Struct.map(Schema.optional)).ast as SchemaAST.TypeLiteral)
    .propertySignatures;
  for (const property of propertiesToUpdate) {
    const index = updatedProperties.findIndex((p) => p.name === property.name);
    if (index !== -1) {
      updatedProperties[index] = property;
    } else {
      updatedProperties.push(property);
    }
  }

  return Schema.make(new SchemaAST.TypeLiteral(updatedProperties, ast.indexSignatures, ast.annotations));
};

export const removeFieldsFromSchema = (schema: Schema.Top, fieldNames: string[]): Schema.Top => {
  return Schema.make(SchemaAST.omit(schema.ast, fieldNames)).annotate(schema.ast.annotations);
};

export const updateFieldNameInSchema = (
  schema: Schema.Top,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): Schema.Top => {
  const ast = schema.ast as SchemaAST.TypeLiteral;
  invariant(SchemaAST.isTypeLiteral(ast));

  return Schema.make(
    new SchemaAST.TypeLiteral(
      ast.propertySignatures.map((p) =>
        p.name === before
          ? new SchemaAST.PropertySignature(after, p.type, p.isOptional, p.isReadonly, p.annotations)
          : p,
      ),
      ast.indexSignatures,
      ast.annotations,
    ),
  );
};
