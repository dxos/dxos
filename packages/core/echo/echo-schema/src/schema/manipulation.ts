//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { type ObjectAnnotation, ObjectAnnotationId } from '../ast';

// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
export const addFieldsToSchema = (schema: S.Schema<any>, fields: S.Struct.Fields): S.Schema<any> => {
  const schemaExtension = S.partial(S.Struct(fields));
  return S.extend(schema, schemaExtension).annotations(schema.ast.annotations) as any as S.Schema<any>;
};

export const updateFieldsInSchema = (schema: S.Schema<any>, fields: S.Struct.Fields): S.Schema<any> => {
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

export const removeFieldsFromSchema = (schema: S.Schema<any>, fieldNames: string[]): S.Schema<any> => {
  return S.make(AST.omit(schema.ast, fieldNames)).annotations(schema.ast.annotations);
};

export const updateFieldNameInSchema = (
  schema: S.Schema<any>,
  { before, after }: { before: PropertyKey; after: PropertyKey },
): S.Schema<any> => {
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

export const setTypenameInSchema = (schema: S.Schema<any>, typename: string): S.Schema<any> => {
  const existingAnnotation = schema.ast.annotations[ObjectAnnotationId] as ObjectAnnotation;
  invariant(existingAnnotation, `Missing ${String(ObjectAnnotationId)}`);

  return schema.annotations({
    ...schema.ast.annotations,
    [ObjectAnnotationId]: { typename, version: existingAnnotation.version },
  });
};
