//
// Copyright 2024 DXOS.org
//

import { flow, Option, pipe, SchemaAST as AST, Schema as S } from 'effect';
import { type Simplify } from 'effect/Types';

import { type Primitive } from '@dxos/util';

import { EntityKind } from './entity-kind';
import { type HasId } from './types';
import { type BaseObject } from '../types';

type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * ECHO object.
 */
export const ObjectAnnotationId = Symbol.for('@dxos/schema/annotation/Object');

export const TYPENAME_REGEX = /^\w+\.\w{2,}\/[\w/]+$/;
export const VERSION_REGEX = /^\d+.\d+.\d+$/;

/**
 * Payload stored under {@link ObjectAnnotationId}.
 */
// TODO(burdon): Reconcile with other types.
// TODO(burdon): Define as schema with regex patterns above.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type ObjectAnnotation = {
  kind: EntityKind;
  typename: string;
  version: string;
};

/**
 * ECHO identifier for a schema.
 * Must be a `dxn:echo:` URI.
 */
export const EchoIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/EchoIdentifier');

/**
 * @returns {@link ObjectAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getObjectAnnotation = (schema: S.Schema.All): ObjectAnnotation | undefined =>
  flow(
    AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: S.Schema.All): EntityKind | undefined => {
  return getObjectAnnotation(schema)?.kind;
};

// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.typename;

export const getSchemaVersion = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.version;

export const getEchoIdentifierAnnotation = (schema: S.Schema.All) =>
  flow(
    AST.getAnnotation<string>(EchoIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

// TODO(burdon): Rename ObjectAnnotation.
// TODO(dmaretskyi): Add `id` property to the schema type.
export const EchoObject = (typename: string, version: string) => {
  return <A, I, R>(self: S.Schema<A, I, R>): S.Schema<Simplify<HasId & ToMutable<A>>> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('EchoObject can only be applied to an S.Struct type.');
    }

    // TODO(dmaretskyi): Allow id on schema.
    // checkIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, {
      [ObjectAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies ObjectAnnotation,
    });
    return S.make(ast) as S.Schema<Simplify<HasId & ToMutable<A>>>;
  };
};

/**
 * PropertyMeta (metadata for dynamic schema properties).
 * For user-defined annotations.
 */
export const PropertyMetaAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyMeta');

export type PropertyMetaValue = Primitive | Record<string, Primitive> | Primitive[];

export type PropertyMetaAnnotation = {
  [name: string]: PropertyMetaValue;
};

export const PropertyMeta = (name: string, value: PropertyMetaValue) => {
  return <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[PropertyMetaAnnotationId] as PropertyMetaAnnotation;
    return self.annotations({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: AST.PropertySignature, name: string) =>
  pipe(
    AST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(prop.type),
    Option.map((meta) => meta[name] as T),
    Option.getOrElse(() => undefined),
  );

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = ObjectAnnotation;

export const getReferenceAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

export const SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');

// TODO(burdon): Factor out.
// TODO(burdon): Reconcile with ObjectAnnotation above.
export type SchemaMeta = {
  id: string;
  typename: string;
  version: string;
};

// TODO(burdon): Factor out when JSON schema parser allows extensions.

/**
 * Identifies label property or JSON path expression.
 */
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');
