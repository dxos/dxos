//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { pipe } from 'effect';
import * as Option from 'effect/Option';
import { type Simplify } from 'effect/Types';

import { Reference } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  type ReactiveHandler,
  createReactiveProxy,
  isValidProxyTarget,
  isReactiveProxy,
  getProxyHandlerSlot,
} from './proxy';
import { getTargetMeta, initMeta } from './reactive-meta-handler';
import { SchemaValidator, symbolSchema, validateIdNotPresentOnSchema } from './schema-validator';
import { TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { type ObjectMeta } from '../object';

// TODO: remove during refactoring. was introduced to help with recursive imports
export abstract class EchoReactiveHandler {
  abstract getSchema(target: any /* ProxyTarget */): S.Schema<any> | undefined;
  abstract getMeta(target: any /* ProxyTarget */): ObjectMeta;
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

export const ExpandoMarker = Symbol.for('@dxos/echo-schema/Expando');

const _Expando = S.struct({}, { key: S.string, value: S.any }).pipe(echoObject('Expando', '0.1.0'));
export interface ExpandoType extends S.Schema.Type<typeof _Expando> {
  id: string;
  [key: string]: any;
  [ExpandoMarker]?: true;
}

export interface ExpandoType extends S.Schema.Type<typeof _Expando> {}

/**
 * Marker value to be passed to `object` constructor to create an ECHO object with a generated ID.
 */
// TODO(dmaretskyi): Rename to `Expando` once old code has been deleted.
export const ExpandoType: S.Schema<ExpandoType> & { [ExpandoMarker]: true } = _Expando as any;

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
  <T extends {}>(schema: typeof ExpandoType, obj: T): ReactiveObject<ExpandoType>;
  <T extends {}>(schema: S.Schema<T>, obj: ExcludeId<T>): ReactiveObject<T>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: ExcludeId<T>): ReactiveObject<T> => {
  if (obj && (schemaOrObj as any) !== ExpandoType) {
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

    initMeta(obj);
    SchemaValidator.prepareTarget(obj as T, schema);
    return createReactiveProxy(obj, TypedReactiveHandler.instance as ReactiveHandler<any>) as ReactiveObject<T>;
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
    initMeta(obj);
    // Untyped.
    return createReactiveProxy(obj as T, UntypedReactiveHandler.instance as ReactiveHandler<any>) as ReactiveObject<T>;
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    initMeta(schemaOrObj);
    // Untyped.
    return createReactiveProxy(
      schemaOrObj as T,
      UntypedReactiveHandler.instance as ReactiveHandler<any>,
    ) as ReactiveObject<T>;
  }
};

export const ReferenceAnnotation = Symbol.for('@dxos/schema/annotation/Reference');
export type ReferenceAnnotationValue = EchoObjectAnnotation;

/**
 * Reference to another ECHO object.
 */
// TODO(dmaretskyi): I wanted to add `T extends Identifiable` but it seems to break definitions with self-references.
export type Ref<T> = T | undefined;

// TODO(dmaretskyi): Assert that schema has `id`.
export const ref = <T extends Identifiable>(schema: S.Schema<T>): S.Schema<Ref<T>> => {
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO object.');
  }

  // TODO(dmaretskyi): Casting here doesn't seem valid. Maybe there's a way to express optionality in the schema?
  return schema.annotations({ [ReferenceAnnotation]: annotation }) as S.Schema<Ref<T>>;
};

export const refArray = <T extends Identifiable>(schema: S.Schema<T>): S.Schema<T[]> => {
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO object.');
  }

  // TODO(dmaretskyi): Casting here doesn't seem valid. Maybe there's a way to express optionality in the schema?
  return S.array(schema.annotations({ [ReferenceAnnotation]: annotation })) as any as S.Schema<T[]>;
};

export const EchoObjectFieldMetaAnnotationId = Symbol.for('@dxos/echo-schema/annotation/FieldMeta');
type FieldMetaValue = Record<string, string | number | boolean | undefined>;
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

export const getFieldMetaAnnotation = <T>(field: AST.PropertySignature, namespace: string) =>
  pipe(
    AST.getAnnotation<EchoObjectFieldMetaAnnotation>(EchoObjectFieldMetaAnnotationId)(field.type),
    Option.map((meta) => meta[namespace] as T),
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
export const getSchema = <T extends {} = any>(obj: T | undefined): S.Schema<any> | undefined => {
  if (obj == null) {
    return undefined;
  }
  if (isReactiveProxy(obj)) {
    const proxyHandlerSlot = getProxyHandlerSlot(obj);
    if (proxyHandlerSlot.handler instanceof EchoReactiveHandler) {
      return proxyHandlerSlot.handler.getSchema(proxyHandlerSlot.target);
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

export const getMeta = <T extends {}>(obj: T): ObjectMeta => {
  const proxyHandlerSlot = getProxyHandlerSlot(obj);
  if (proxyHandlerSlot.handler instanceof EchoReactiveHandler) {
    return proxyHandlerSlot.handler.getMeta(proxyHandlerSlot.target);
  } else {
    return getTargetMeta(obj);
  }
};

export const typeOf = <T extends {}>(obj: T | undefined): Reference | undefined => getTypeReference(getSchema(obj));

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
