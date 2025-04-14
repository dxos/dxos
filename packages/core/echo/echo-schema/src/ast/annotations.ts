//
// Copyright 2024 DXOS.org
//

import { flow, Option, pipe, SchemaAST as AST, Schema as S } from 'effect';
import { type Simplify } from 'effect/Types';

import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { type Primitive } from '@dxos/util';

import { EntityKind } from './entity-kind';
import { type HasId } from './types';
import { type BaseObject } from '../types';

// TODO(burdon): Rename?
type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * ECHO object.
 */
export const ObjectAnnotationId = Symbol.for('@dxos/schema/annotation/Object');

/** @internal */
export const TYPENAME_REGEX = /^\w+\.\w{2,}\/[\w/]+$/;
/** @internal */
export const VERSION_REGEX = /^\d+.\d+.\d+$/;

/**
 * Payload stored under {@link ObjectAnnotationId}.
 */
// TODO(burdon): Rename TypeAnnotation?
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const ObjectAnnotation = S.Struct({
  kind: S.Enums(EntityKind),
  typename: S.String.pipe(S.pattern(TYPENAME_REGEX)),
  version: S.String.pipe(S.pattern(VERSION_REGEX)),
});

export interface ObjectAnnotation extends S.Schema.Type<typeof ObjectAnnotation> {}

export type TypeMeta = Pick<ObjectAnnotation, 'typename' | 'version'>;

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
export const getEntityKind = (schema: S.Schema.All): EntityKind | undefined => getObjectAnnotation(schema)?.kind;

/**
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.typename;

/**
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: S.Schema.All): string | undefined => getObjectAnnotation(schema)?.version;

/**
 * ECHO identifier for a schema.
 * Must be a `dxn:echo:` URI.
 */
export const ObjectIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/ObjectIdentifier');

export const getObjectIdentifierAnnotation = (schema: S.Schema.All) =>
  flow(
    AST.getAnnotation<string>(ObjectIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

// TODO(burdon): Rename EchoType.
export const EchoObject: {
  (meta: TypeMeta): <S extends S.Schema.Any>(self: S) => EchoObjectSchema<S>;
} = ({ typename, version }) => {
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
  extends TypeMeta,
    S.AnnotableClass<
      EchoObjectSchema<Self>,
      EchoObjectSchemaData<S.Schema.Type<Self>>,
      EchoObjectSchemaData<S.Schema.Encoded<Self>>,
      S.Schema.Context<Self>
    > {}

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

export type SchemaMeta = TypeMeta & { id: string };

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
// TODO(burdon): Move to property.
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
// TODO(burdon): Convert to JsonPath?
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
