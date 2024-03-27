//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { pipe } from 'effect';
import * as Option from 'effect/Option';
import { type Simplify } from 'effect/Types';

import { Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  type ReactiveHandler,
  createReactiveProxy,
  isValidProxyTarget,
  isReactiveProxy,
  getProxyHandlerSlot,
} from './proxy';
import { SchemaValidator, symbolSchema, validateIdNotPresentOnSchema } from './schema-validator';
import { TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { type ObjectMeta } from '../object';

// TODO: remove during refactoring. was introduced to help with recursive imports
export abstract class EchoReactiveHandler {
  abstract getSchema(): S.Schema<any> | undefined;
  abstract getMeta(): ObjectMeta;
}

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

export const EchoObjectAnnotationId = Symbol.for('@dxos/echo-schema/annotation/NamedSchema');
export type EchoObjectAnnotation = {
  storedSchemaId?: string;
  typename: string;
  version: string;
};

// TODO(dmaretskyi): Add `id` field to the schema type.
export const echoObject =
  (typename: string, version: string) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<Simplify<Identifiable & ToMutable<A>>> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('echoObject can only be applied to S.struct instances.');
    }

    validateIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.struct({ id: S.string }));

    return S.make(AST.annotations(schemaWithId.ast, { [EchoObjectAnnotationId]: { typename, version } })) as S.Schema<
      Simplify<Identifiable & ToMutable<A>>
    >;
  };

const _AnyEchoObject = S.struct({}).pipe(echoObject('Any', '0.1.0'));
export interface AnyEchoObject extends S.Schema.Type<typeof _AnyEchoObject> {}
export const AnyEchoObject: S.Schema<AnyEchoObject> = _AnyEchoObject;

export const ExpandoMarker = Symbol.for('@dxos/echo-schema/Expando');

const _Expando = S.struct({}).pipe(echoObject('Expando', '0.1.0'));
/**
 * @deprecated Need API review.
 */
export interface ExpandoType extends S.Schema.Type<typeof _Expando> {
  [ExpandoMarker]: true;
}
/**
 * Marker value to be passed to `object` constructor to create an ECHO object with a generated ID.
 *
 * @deprecated Need API review.
 */
export const ExpandoType: S.Schema<ExpandoType> = _Expando as any;

/**
 * Has `id`.
 */
export interface Identifiable {
  readonly id: string;
}

type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

// TODO(dmaretskyi): UUID v8.
const generateId = () => PublicKey.random().toHex();

export type ObjectType<T extends S.Schema<any>> = ToMutable<S.Schema.Type<T>>;

export type ToMutable<T> = T extends {}
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

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

export type EchoReactiveObject<T> = ReactiveObject<T> & Identifiable;

export const isEchoReactiveObject = (value: unknown): value is EchoReactiveObject<any> =>
  isReactiveProxy(value) && getProxyHandlerSlot(value).handler instanceof EchoReactiveHandler;

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(burdon): Option to return mutable object.
// TODO(dmaretskyi): Deep mutability.
export const object: {
  <T extends {}>(obj: T): ReactiveObject<T>;
  <T extends {}>(schema: typeof ExpandoType, obj: T): ReactiveObject<Identifiable & T>;
  <T extends {}>(schema: S.Schema<T>, obj: ExcludeId<T>): ReactiveObject<T>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: ExcludeId<T>): ReactiveObject<T> => {
  if (obj) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    const echoAnnotation = getEchoObjectAnnotation(schema);
    if (echoAnnotation) {
      if ('id' in (obj as any)) {
        throw new Error(
          'Provided object already has an `id` field. `id` field is reserved and will be automatically generated.',
        );
      }

      (obj as any).id = generateId();
    }

    SchemaValidator.prepareTarget(obj as T, schema);
    return createReactiveProxy(obj, new TypedReactiveHandler()) as ReactiveObject<T>;
  } else if (obj && (schemaOrObj as any) === ExpandoType) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    if ('id' in (obj as any)) {
      throw new Error(
        'Provided object already has an `id` field. `id` field is reserved and will be automatically generated.',
      );
    }

    (obj as any).id = generateId();

    // Untyped.
    return createReactiveProxy(obj as T, UntypedReactiveHandler.instance as ReactiveHandler<any>) as ReactiveObject<T>;
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    // Untyped.
    return createReactiveProxy(
      schemaOrObj as T,
      UntypedReactiveHandler.instance as ReactiveHandler<any>,
    ) as ReactiveObject<T>;
  }
};

export const ReferenceAnnotation = Symbol.for('@dxos/schema/annotation/Reference');
export type ReferenceAnnotationValue = EchoObjectAnnotation;

// TODO(dmaretskyi): Assert that schema has `id`.
export const ref = <T extends Identifiable>(schema: S.Schema<T>): S.Schema<T> => {
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO object.');
  }

  return schema.annotations({ [ReferenceAnnotation]: annotation });
};

export const EchoObjectFieldMetaAnnotationId = Symbol.for('@dxos/echo-schema/annotation/FieldMeta');
type FieldMetaValue = Record<string, string | number | boolean>;
export type EchoObjectFieldMetaAnnotation = {
  [namespace: string]: FieldMetaValue;
};

export const fieldMeta =
  (namespace: string, meta: FieldMetaValue) =>
  <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[EchoObjectFieldMetaAnnotationId] as EchoObjectFieldMetaAnnotation;
    return self.annotations({
      [EchoObjectFieldMetaAnnotationId]: {
        ...existingMeta,
        [namespace]: { ...(existingMeta ?? {})[namespace], ...meta },
      },
    });
  };

export const getFieldMetaAnnotation = (field: AST.PropertySignature, namespace: string) =>
  pipe(
    AST.getAnnotation<EchoObjectFieldMetaAnnotation>(EchoObjectFieldMetaAnnotationId)(field.type),
    Option.map((meta) => meta[namespace]),
    Option.getOrElse(() => undefined),
  );

export const getRefAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotation)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {} = any>(obj: T): S.Schema<any> | undefined => {
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

export const getTypeReference = (schema: S.Schema<any> | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  return Reference.fromLegacyTypename(annotation.storedSchemaId ?? annotation.typename);
};

export const metaOf = <T extends {}>(obj: T): ObjectMeta => {
  const proxy = getProxyHandlerSlot(obj);
  invariant(proxy.handler instanceof EchoReactiveHandler, 'Not a reactive ECHO object');
  return proxy.handler.getMeta();
};

export const typeOf = <T extends {}>(obj: T): Reference | undefined => getTypeReference(getSchema(obj));

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
