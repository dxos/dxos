//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';

import { type TypeAnnotation, TypeAnnotationId, TypeIdentifierAnnotationId } from '../ast';
import { DXN } from '@dxos/keys';

// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
export const addFieldsToSchema = (
  schema: Schema.Schema.AnyNoContext,
  fields: Schema.Struct.Fields,
): Schema.Schema.AnyNoContext => {
  const schemaExtension = Schema.partial(Schema.Struct(fields));
  return Schema.extend(schema, schemaExtension).annotations(
    schema.ast.annotations,
  ) as any as Schema.Schema.AnyNoContext;
};

export const updateFieldsInSchema = (
  schema: Schema.Schema.AnyNoContext,
  fields: Schema.Struct.Fields,
): Schema.Schema.AnyNoContext => {
  const ast = schema.ast as SchemaAST.TypeLiteral;
  invariant(SchemaAST.isTypeLiteral(ast));

  const updatedProperties = [...ast.propertySignatures];
  const propertiesToUpdate = (Schema.partial(Schema.Struct(fields)).ast as SchemaAST.TypeLiteral).propertySignatures;
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

export const removeFieldsFromSchema = (
  schema: Schema.Schema.AnyNoContext,
  fieldNames: string[],
): Schema.Schema.AnyNoContext => {
  return Schema.make(SchemaAST.omit(schema.ast, fieldNames)).annotations(schema.ast.annotations);
};

export const updateFieldNameInSchema = (
  schema: Schema.Schema.AnyNoContext,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): Schema.Schema.AnyNoContext => {
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

export const setTypenameInSchema = (
  schema: Schema.Schema.AnyNoContext,
  typename: string,
): Schema.Schema.AnyNoContext => {
  const existingAnnotation = schema.ast.annotations[TypeAnnotationId] as TypeAnnotation;
  invariant(existingAnnotation, `Missing ${String(TypeAnnotationId)}`);

  return schema.annotations({
    ...schema.ast.annotations,
    [TypeAnnotationId]: {
      kind: existingAnnotation.kind,
      typename,
      version: existingAnnotation.version,
    } satisfies TypeAnnotation,
    [SchemaAST.JSONSchemaAnnotationId]: {
      ...(schema.ast.annotations[SchemaAST.JSONSchemaAnnotationId] ?? {}),
      $id: schema.ast.annotations[TypeIdentifierAnnotationId] ?? DXN.fromTypename(typename).toString(),
      typename,
    },
  });
};
