//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { pipe } from 'effect';
import * as Option from 'effect/Option';

import { Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';

import { EchoReactiveHandler } from './echo-handler';
import {
  type ReactiveHandler,
  createReactiveProxy,
  isValidProxyTarget,
  isReactiveProxy,
  getProxyHandlerSlot,
} from './proxy';
import { SchemaValidator, symbolSchema } from './schema-validator';
import { TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { Mutable } from 'effect/Types';

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

export const EchoObjectAnnotationId = Symbol.for('@dxos/echo-schema/annotation/NamedSchema');
export type EchoObjectAnnotation = {
  typename: string;
  version: string;
};

export const echoObject =
  (typename: string, version: string) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> =>
    S.make(AST.setAnnotation(self.ast, EchoObjectAnnotationId, { typename, version }));

export const getEchoObjectAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<EchoObjectAnnotation>(EchoObjectAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

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
// TODO(dmaretskyi): Deep mutability.
export const object: {
  <T extends {}>(obj: T): ReactiveObject<Mutable<T>>;
  <T extends {}>(schema: S.Schema<T>, obj: T): ReactiveObject<Mutable<T>>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: T): ReactiveObject<Mutable<T>> => {
  if (obj) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    SchemaValidator.prepareTarget(obj, schema);
    return createReactiveProxy(obj, new TypedReactiveHandler());
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    // Untyped.
    return createReactiveProxy(schemaOrObj as T, UntypedReactiveHandler.instance as ReactiveHandler<any>);
  }
};

export const ReferenceAnnotation = Symbol.for('@dxos/schema/annotation/Reference');
export type ReferenceAnnotationValue = {};

export const ref = <T>(targetType: S.Schema<T>): S.Schema<T> =>
  S.make(AST.setAnnotation(targetType.ast, ReferenceAnnotation, {}));

export const getRefAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotation)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {}>(obj: T): S.Schema<T> | undefined => {
  if (isReactiveProxy(obj)) {
    const proxyHandlerSlot = getProxyHandlerSlot(obj);
    if (proxyHandlerSlot.handler instanceof EchoReactiveHandler) {
      return proxyHandlerSlot.handler.getSchema();
    }
  }

  const schema = (obj as any)[symbolSchema];
  if (!schema) {
    return undefined;
  }

  invariant(S.isSchema(schema), 'Invalid schema.');
  return schema as S.Schema<T>;
};

export const getTypeReference = (schema: S.Schema<any>): Reference | undefined => {
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  return Reference.fromLegacyTypename(annotation.typename);
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
