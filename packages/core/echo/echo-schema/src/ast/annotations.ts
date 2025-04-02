//
// Copyright 2024 DXOS.org
//

import { flow, Option, pipe, SchemaAST as AST, Schema as S } from 'effect';
import { type Simplify } from 'effect/Types';

import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';
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

/**
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.typename;

/**
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.version;

export const getEchoIdentifierAnnotation = (schema: S.Schema.All) =>
  flow(
    AST.getAnnotation<string>(EchoIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

// TODO(burdon): Rename DB.Object (with namespace).
// TODO(burdon): Pass in object ({ typename, version }).
// TODO(dmaretskyi): Add `id` property to the schema type.
export const EchoObject: {
  (typename: string, version: string): <S extends S.Schema.Any>(self: S) => EchoObjectSchema<S>;
} = (typename: string, version: string) => {
  return <Self extends S.Schema.Any>(self: Self): EchoObjectSchema<Self> => {
    if (!AST.isTypeLiteral(self.ast)) {
      throw new Error('EchoObject can only be applied to an S.Struct type.');
    }

    // TODO(dmaretskyi): Allow id on schema.
    // checkIdNotPresentOnSchema(self);

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [ObjectAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies ObjectAnnotation,
    });

    return makeEchoObjectSchemaClass<Self>(typename, version, ast);
  };
};

const makeEchoObjectSchemaClass = <Self extends S.Schema.Any>(
  typename: string,
  version: string,
  ast: AST.AST,
): EchoObjectSchema<Self> => {
  return class EchoObjectSchemaClass extends S.make<
    EchoObjectSchemaData<S.Schema.Type<Self>>,
    EchoObjectSchemaData<S.Schema.Encoded<Self>>,
    S.Schema.Context<Self>
  >(ast) {
    static override annotations(
      annotations: S.Annotations.Schema<EchoObjectSchemaData<S.Schema.Type<Self>>>,
    ): EchoObjectSchema<Self> {
      return makeEchoObjectSchemaClass(
        typename,
        version,
        S.make<EchoObjectSchemaData<S.Schema.Type<Self>>>(ast).annotations(annotations).ast,
      );
    }

    static readonly typename = typename;
    static readonly version = version;
  };
};

type EchoObjectSchemaData<T> = Simplify<HasId & ToMutable<T>>;

export interface EchoObjectSchema<Self extends S.Schema.Any>
  extends S.AnnotableClass<
    EchoObjectSchema<Self>,
    EchoObjectSchemaData<S.Schema.Type<Self>>,
    EchoObjectSchemaData<S.Schema.Encoded<Self>>,
    S.Schema.Context<Self>
  > {
  /**
   * Fully qualified type name.
   * @example `dxos.org/type/Contact`
   **/
  readonly typename: string;

  /**
   * Semver schema version.
   * @example `0.1.0`
   */
  readonly version: string;
}

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

export const getReferenceAnnotation = (schema: S.Schema.AnyNoContext) =>
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
 * Either a string or an array of strings representing field accessors each matched in priority order.
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

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
export const getLabel = <S extends S.Schema.Any>(schema: S, object: S.Schema.Type<S>): string | undefined => {
  let annotation = schema.ast.annotations[LabelAnnotationId];
  if (!annotation) {
    return undefined;
  }
  if (!Array.isArray(annotation)) {
    annotation = [annotation];
  }
  for (const accessor of annotation as string[]) {
    assertArgument(typeof accessor === 'string', 'Label annotation must be a string or an array of strings');
    const value = getField(object, accessor as JsonPath);
    log.info('getLabel', { annotation, accessor, value });
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return value.toString();
      case 'undefined':
      case 'object':
      case 'function':
        continue;
    }
  }
  return undefined;
};
