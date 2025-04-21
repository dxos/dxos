//
// Copyright 2024 DXOS.org
//

import { flow, Option, pipe, SchemaAST as AST, Schema as S } from 'effect';
import { type Simplify } from 'effect/Types';

import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { type Primitive } from '@dxos/util';

import { EntityKind } from './entity-kind';
import { type HasId } from './types';
import { type BaseObject } from '../types';

// TODO(burdon): Rename?
type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * ECHO type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

export const Typename = S.String.pipe(S.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
export const Version = S.String.pipe(S.pattern(/^\d+.\d+.\d+$/));

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const TypeAnnotation = S.Struct({
  kind: S.Enums(EntityKind),
  typename: Typename,
  version: Version,
});

export interface TypeAnnotation extends S.Schema.Type<typeof TypeAnnotation> {}

export type TypeMeta = Pick<TypeAnnotation, 'typename' | 'version'>;

/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getTypeAnnotation = (schema: S.Schema.All): TypeAnnotation | undefined =>
  flow(
    AST.getAnnotation<TypeAnnotation>(TypeAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: S.Schema.All): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: S.Schema.All): string | undefined => getTypeAnnotation(schema)?.version;

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

/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(burdon): Reconcile EchoObject/EchoSchema; rename EchoType.
export const EchoObject: {
  // TODO(burdon): Tighten Self type to S.TypeLiteral or S.Struct.
  (meta: TypeMeta): <Self extends S.Schema.Any>(self: Self) => EchoObjectSchema<Self>;
} = ({ typename, version }) => {
  return <Self extends S.Schema.Any>(self: Self): EchoObjectSchema<Self> => {
    invariant(AST.isTypeLiteral(self.ast), 'Must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
    });

    return makeEchoObjectSchema<Self>(typename, version, ast);
  };
};

type EchoObjectSchemaType<T> = Simplify<HasId & ToMutable<T>>;

export interface EchoObjectSchema<Self extends S.Schema.Any>
  extends TypeMeta,
    S.AnnotableClass<
      EchoObjectSchema<Self>,
      EchoObjectSchemaType<S.Schema.Type<Self>>,
      EchoObjectSchemaType<S.Schema.Encoded<Self>>,
      S.Schema.Context<Self>
    > {
  instanceOf(value: unknown): boolean;
}

const makeEchoObjectSchema = <Self extends S.Schema.Any>(
  typename: string,
  version: string,
  ast: AST.AST,
): EchoObjectSchema<Self> => {
  return class EchoObjectSchemaClass extends S.make<
    EchoObjectSchemaType<S.Schema.Type<Self>>,
    EchoObjectSchemaType<S.Schema.Encoded<Self>>,
    S.Schema.Context<Self>
  >(ast) {
    static readonly typename = typename;
    static readonly version = version;

    static override annotations(
      annotations: S.Annotations.GenericSchema<EchoObjectSchemaType<S.Schema.Type<Self>>>,
    ): EchoObjectSchema<Self> {
      return makeEchoObjectSchema<Self>(
        typename,
        version,
        S.make<EchoObjectSchemaType<S.Schema.Type<Self>>>(ast).annotations(annotations).ast,
      );
    }

    static instanceOf(value: unknown): boolean {
      return S.is(this)(value);
    }
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

export type ReferenceAnnotationValue = TypeAnnotation;

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
