//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { createReactiveProxy, isValidProxyTarget } from './proxy';
import { TypedReactiveHandler, setAstProperty, symbolSchema } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

// https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#introduction

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
// TODO(burdon): Is the type needed?
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(burdon): Option to return mutable object.
export const object: {
  <T extends {}>(obj: T): ReactiveObject<T>;
  <T extends {}>(schema: S.Schema<T>, obj: T): ReactiveObject<T>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: T): ReactiveObject<T> => {
  if (obj) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    // typed case
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    const _ = S.asserts(schema)(obj);

    Object.defineProperty(obj, symbolSchema, { enumerable: false, value: schema });
    setAstProperty(obj, schema.ast);

    return createReactiveProxy(obj, new TypedReactiveHandler());
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    // untyped case
    return createReactiveProxy(schemaOrObj as T, new UntypedReactiveHandler());
  }
};

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {}>(obj: T): S.Schema<T> | undefined => {
  const schema = (obj as any)[symbolSchema];
  if (!schema) {
    return undefined;
  }

  invariant(S.isSchema(schema), 'Invalid schema.');
  return schema as S.Schema<T>;
};

/**
 * Recursively visit properties of the given object.
 */
// TODO(burdon): Ref unist-util-visit (e.g., specify filter).
export const visitProperties = (
  root: AST.AST,
  visitor: (property: AST.PropertySignature, path: PropertyKey[]) => void,
  rootPath: PropertyKey[] = [],
): void => {
  AST.getPropertySignatures(root).forEach((property) => {
    const path = [...rootPath, property.name];
    visitor(property, path);

    // Recursively visit properties.
    if (AST.isTypeLiteral(property.type)) {
      visitProperties(property.type, visitor, path);
    } else if (AST.isUnion(property.type)) {
      property.type.types.forEach((type) => {
        if (AST.isTypeLiteral(type)) {
          visitProperties(type, visitor, path);
        }
      });
    }
  });
};
