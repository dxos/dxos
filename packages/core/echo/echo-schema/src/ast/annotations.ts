//
// Copyright 2024 DXOS.org
//

import { flow, pipe, Option, Schema, SchemaAST } from 'effect';

import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { createAnnotationHelper } from './annotation-helper';
import { EntityKind } from './entity-kind';

/**
 * ECHO identifier (for a stored schema).
 * Must be a `dxn:echo:` URI.
 */
export const TypeIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/TypeIdentifier');

export const getTypeIdentifierAnnotation = (schema: Schema.Schema.All) =>
  flow(
    SchemaAST.getAnnotation<string>(TypeIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * ECHO type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

export const Typename = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
export const Version = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/));

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const TypeAnnotation = Schema.Struct({
  kind: Schema.Enums(EntityKind),
  typename: Typename,
  version: Version,

  /**
   * If this is a relation, the schema of the source object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  sourceSchema: Schema.optional(DXN.Schema),

  /**
   * If this is a relation, the schema of the target object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  targetSchema: Schema.optional(DXN.Schema),
});

export interface TypeAnnotation extends Schema.Schema.Type<typeof TypeAnnotation> {}

export type TypeMeta = Pick<TypeAnnotation, 'typename' | 'version'>;

/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getTypeAnnotation = (schema: Schema.Schema.All): TypeAnnotation | undefined => {
  assertArgument(schema != null && schema.ast != null, 'invalid schema');
  return flow(
    SchemaAST.getAnnotation<TypeAnnotation>(TypeAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);
};

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: Schema.Schema.All): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @deprecated Use {@link getTypeAnnotation} instead.
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @deprecated Use {@link getTypeAnnotation} instead.
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.version;

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
  return <A, I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[PropertyMetaAnnotationId] as PropertyMetaAnnotation;
    return self.annotations({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: SchemaAST.PropertySignature, name: string) =>
  pipe(
    SchemaAST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(prop.type),
    Option.map((meta) => meta[name] as T),
    Option.getOrElse(() => undefined),
  );

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = TypeAnnotation;

export const getReferenceAnnotation = (schema: Schema.Schema.AnyNoContext) =>
  pipe(
    SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * SchemaMeta.
 */
export const SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');

export type SchemaMeta = TypeMeta & { id: string };

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');

export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): This is really a title, not a label.
// TODO(burdon): Convert to JsonPath?
export const getLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>): string | undefined => {
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

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

export type GeneratorAnnotationValue = {
  generator: string;
  probability?: number;
};

export const GeneratorAnnotation = createAnnotationHelper<string | GeneratorAnnotationValue>(GeneratorAnnotationId);
