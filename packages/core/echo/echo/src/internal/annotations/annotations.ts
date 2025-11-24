//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type JsonPath, getField } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { EntityKind, getSchema } from '../types';

import { TypeMeta } from './types';
import { createAnnotationHelper } from './util';

/**
 * @internal
 */
export const FIELD_PATH_ANNOTATION = 'path';

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
// TODO(burdon): Field, vs. path vs. property.
export const FieldPath = (path: string) => PropertyMeta(FIELD_PATH_ANNOTATION, path);

/**
 * ECHO identifier (for a stored schema).
 * Must be a `dxn:echo:` URI.
 */
export const TypeIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/TypeIdentifier');

export const getTypeIdentifierAnnotation = (schema: Schema.Schema.All) =>
  Function.flow(
    SchemaAST.getAnnotation<string>(TypeIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * Entity type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
export const TypeAnnotation = Schema.extend(
  TypeMeta,
  Schema.Struct({
    kind: Schema.Enums(EntityKind),
    // kind: Schema.Enums(EntityKind),
    // typename: Typename,
    // version: VersionSchema,

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
  }),
);

export interface TypeAnnotation extends Schema.Schema.Type<typeof TypeAnnotation> {}

// export type TypeMeta = Pick<TypeAnnotation, 'typename' | 'version'>;

/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getTypeAnnotation = (schema: Schema.Schema.All): TypeAnnotation | undefined => {
  assertArgument(schema != null && schema.ast != null, 'schema', 'invalid schema');
  return Function.flow(
    SchemaAST.getAnnotation<TypeAnnotation>(TypeAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);
};

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: Schema.Schema.All): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @internal
 * @returns Schema typename (without dxn: prefix or version number).
 */
export const getSchemaTypename = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @internal
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
  Function.pipe(
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
  Function.pipe(
    SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * SchemaMeta.
 */
export const SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');
export type SchemaMeta = TypeMeta & { id: string };

/**
 * Identifies a schema as a schema for a hidden system type.
 */
export const SystemTypeAnnotationId = Symbol.for('@dxos/schema/annotation/SystemType');
export const SystemTypeAnnotation = createAnnotationHelper<boolean>(SystemTypeAnnotationId);

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');
export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

/**
 * @deprecated Use {@link Obj.getLabel} instead.
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
export const getLabelForObject = (obj: unknown | undefined): string | undefined => {
  const schema = getSchema(obj);
  if (schema) {
    return getLabel(schema, obj);
  }
};

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
export const getLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>): string | undefined => {
  const annotation = LabelAnnotation.get(schema).pipe(Option.getOrElse(() => ['name']));
  for (const accessor of annotation) {
    assertArgument(
      typeof accessor === 'string',
      'accessor',
      'Label annotation must be a string or an array of strings',
    );
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
 * Sets the label for a given object based on {@link LabelAnnotationId}.
 */
export const setLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>, label: string) => {
  const annotation = LabelAnnotation.get(schema).pipe(
    Option.map((field) => field[0]),
    Option.getOrElse(() => 'name'),
  );
  object[annotation] = label;
};

/**
 * Identifies description property or JSON path expression.
 * A string representing field accessor.
 */
export const DescriptionAnnotationId = Symbol.for('@dxos/schema/annotation/Description');
export const DescriptionAnnotation = createAnnotationHelper<string>(DescriptionAnnotationId);

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
export const getDescription = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
): string | undefined => {
  const accessor = DescriptionAnnotation.get(schema).pipe(Option.getOrElse(() => 'description'));
  assertArgument(typeof accessor === 'string', 'accessor', 'Description annotation must be a string');
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
    default:
      return undefined;
  }
};

/**
 * Sets the description for a given object based on {@link DescriptionAnnotationId}.
 */
export const setDescription = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
  description: string,
) => {
  const accessor = DescriptionAnnotation.get(schema).pipe(Option.getOrElse(() => 'description'));
  object[accessor] = description;
};

/**
 * Identifies if a property should be included in a form or not.
 * By default, all properties are included in forms, so this is opt-out.
 */
export const FormInputAnnotationId = Symbol.for('@dxos/schema/annotation/FormInput');
export const FormInputAnnotation = createAnnotationHelper<boolean>(FormInputAnnotationId);

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

export type GeneratorAnnotationValue =
  | string
  | {
      generator: string;
      args?: any[];
      probability?: number;
    };

export const GeneratorAnnotation = createAnnotationHelper<GeneratorAnnotationValue>(GeneratorAnnotationId);

/**
 * @returns DXN of the schema.
 *
 * For non-stored schema returns `dxn:type:`.
 * For stored schema returns `dxn:echo:`.
 */
export const getSchemaDXN = (schema: Schema.Schema.All): DXN | undefined => {
  assertArgument(Schema.isSchema(schema), 'schema', 'invalid schema');

  const id = getTypeIdentifierAnnotation(schema);
  if (id) {
    return DXN.parse(id);
  }

  // TODO(dmaretskyi): Add support for dynamic schema.
  const objectAnnotation = getTypeAnnotation(schema);
  if (!objectAnnotation) {
    return undefined;
  }

  return DXN.fromTypenameAndVersion(objectAnnotation.typename, objectAnnotation.version);
};
