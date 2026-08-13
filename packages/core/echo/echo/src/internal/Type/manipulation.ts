//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { SchemaAST } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
export const addFieldsToSchema = (schema: Schema.Top, fields: Schema.Struct.Fields): Schema.Top => {
  const ast = schema.ast as SchemaAST.Objects;
  invariant(SchemaAST.isObjects(ast));

  // Rebuilt through the AST like its siblings below: `mapFields` is a `Struct` operation and this
  // takes any `Schema.Top`.
  const added = (Schema.Struct(fields).mapFields(Struct.map(Schema.optional)).ast as SchemaAST.Objects)
    .propertySignatures;

  return Schema.make<Schema.Top>(
    new SchemaAST.Objects([...ast.propertySignatures, ...added], ast.indexSignatures, ast.annotations),
  );
};

export const updateFieldsInSchema = (schema: Schema.Top, fields: Schema.Struct.Fields): Schema.Top => {
  const ast = schema.ast as SchemaAST.Objects;
  invariant(SchemaAST.isObjects(ast));

  const updatedProperties = [...ast.propertySignatures];
  const propertiesToUpdate = (Schema.Struct(fields).mapFields(Struct.map(Schema.optional)).ast as SchemaAST.Objects)
    .propertySignatures;
  for (const property of propertiesToUpdate) {
    const index = updatedProperties.findIndex((p) => p.name === property.name);
    if (index !== -1) {
      updatedProperties[index] = property;
    } else {
      updatedProperties.push(property);
    }
  }

  return Schema.make<Schema.Top>(new SchemaAST.Objects(updatedProperties, ast.indexSignatures, ast.annotations));
};

export const removeFieldsFromSchema = (schema: Schema.Top, fieldNames: string[]): Schema.Top => {
  return Schema.make<Schema.Top>(SchemaAST.omit(schema.ast, fieldNames));
};

export const updateFieldNameInSchema = (
  schema: Schema.Top,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): Schema.Top => {
  const ast = schema.ast as SchemaAST.Objects;
  invariant(SchemaAST.isObjects(ast));

  return Schema.make<Schema.Top>(
    new SchemaAST.Objects(
      ast.propertySignatures.map((p) => (p.name === before ? new SchemaAST.PropertySignature(after, p.type) : p)),
      ast.indexSignatures,
      ast.annotations,
    ),
  );
};
