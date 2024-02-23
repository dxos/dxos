//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget } from './proxy';
import { TypedReactiveHandler, setAstProperty, symbolSchema } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

// https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#introduction
// https://effect-ts.github.io/effect/schema/Schema.ts.html

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
// This type doesn't change the shape of the object, it is rather used as an indicator that the object is reactive.
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

    // Typed.
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    const _ = S.asserts(schema)(obj);

    Object.defineProperty(obj, symbolSchema, { enumerable: false, value: schema });
    setAstProperty(obj, schema.ast);

    return createReactiveProxy(obj, new TypedReactiveHandler());
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    // Untyped.
    return createReactiveProxy(schemaOrObj as T, UntypedReactiveHandler.instance as ReactiveHandler<any>);
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

export type PropertyVisitor<T> = (property: AST.PropertySignature, path: PropertyKey[]) => T;

/**
 * Recursively visit properties of the given object.
 */
// TODO(burdon): Ref unist-util-visit (e.g., specify filter).
export const visit = (root: AST.AST, visitor: PropertyVisitor<void>, rootPath: PropertyKey[] = []): void => {
  AST.getPropertySignatures(root).forEach((property) => {
    const path = [...rootPath, property.name];
    visitor(property, path);

    // Recursively visit properties.
    const { type } = property;
    if (AST.isTypeLiteral(type)) {
      visit(type, visitor, path);
    } else if (AST.isUnion(type)) {
      type.types.forEach((type) => {
        if (AST.isTypeLiteral(type)) {
          visit(type, visitor, path);
        }
      });
    }
  });
};

export const reduce = <T>(
  root: AST.AST,
  visitor: (acc: T, property: AST.PropertySignature, path: PropertyKey[]) => T,
  initialValue: T,
): T => {
  let acc = initialValue;
  visit(root, (property, path) => {
    acc = visitor(acc, property, path);
  });

  return acc;
};
