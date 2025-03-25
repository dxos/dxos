//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

import { invariant } from '@dxos/invariant';

import { type ObjectAnnotation, ObjectAnnotationId } from '../ast';

// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
export const addFieldsToSchema = (schema: S.Schema.AnyNoContext, fields: S.Struct.Fields): S.Schema.AnyNoContext => {
  const schemaExtension = S.partial(S.Struct(fields));
  return S.extend(schema, schemaExtension).annotations(schema.ast.annotations) as any as S.Schema.AnyNoContext;
};

export const updateFieldsInSchema = (schema: S.Schema.AnyNoContext, fields: S.Struct.Fields): S.Schema.AnyNoContext => {
  const ast = schema.ast as AST.TypeLiteral;
  invariant(AST.isTypeLiteral(ast));

  const updatedProperties = [...ast.propertySignatures];
  const propertiesToUpdate = (S.partial(S.Struct(fields)).ast as AST.TypeLiteral).propertySignatures;
  for (const property of propertiesToUpdate) {
    const index = updatedProperties.findIndex((p) => p.name === property.name);
    if (index !== -1) {
      updatedProperties[index] = property;
    } else {
      updatedProperties.push(property);
    }
  }

  return S.make(new AST.TypeLiteral(updatedProperties, ast.indexSignatures, ast.annotations));
};

export const removeFieldsFromSchema = (schema: S.Schema.AnyNoContext, fieldNames: string[]): S.Schema.AnyNoContext => {
  return S.make(AST.omit(schema.ast, fieldNames)).annotations(schema.ast.annotations);
};

export const updateFieldNameInSchema = (
  schema: S.Schema.AnyNoContext,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): S.Schema.AnyNoContext => {
  const ast = schema.ast as AST.TypeLiteral;
  invariant(AST.isTypeLiteral(ast));

  return S.make(
    new AST.TypeLiteral(
      ast.propertySignatures.map((p) =>
        p.name === before ? new AST.PropertySignature(after, p.type, p.isOptional, p.isReadonly, p.annotations) : p,
      ),
      ast.indexSignatures,
      ast.annotations,
    ),
  );
};

export const setTypenameInSchema = (schema: S.Schema.AnyNoContext, typename: string): S.Schema.AnyNoContext => {
  const existingAnnotation = schema.ast.annotations[ObjectAnnotationId] as ObjectAnnotation;
  invariant(existingAnnotation, `Missing ${String(ObjectAnnotationId)}`);

  return schema.annotations({
    ...schema.ast.annotations,
    [ObjectAnnotationId]: {
      kind: existingAnnotation.kind,
      typename,
      version: existingAnnotation.version,
    } satisfies ObjectAnnotation,
  });
};
