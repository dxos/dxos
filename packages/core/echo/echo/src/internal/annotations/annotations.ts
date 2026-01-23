//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { raise } from '@dxos/debug';
import { type JsonPath, getField } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { type AnyProperties, EntityKind, TypeId, getSchema } from '../types';

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

//
// Type
//

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

/**
 * @param input schema or a typename string.
 * @return type DXN.
 */
export const getTypeDXNFromSpecifier = (input: Schema.Schema.All | string): DXN => {
  if (Schema.isSchema(input)) {
    return getSchemaDXN(input) ?? raise(new TypeError('Schema has no DXN'));
  } else {
    assertArgument(typeof input === 'string', 'input');
    assertArgument(!input.startsWith('dxn:'), 'input');
    return DXN.fromTypename(input);
  }
};

//
// TypeAnnotation
//

/**
 * Fully qualified globally unique typename.
 * Example: `dxos.org/type/Message`
 */
// TODO(burdon): Reconcile with short DXN format.
// TODO(burdon): Change "/type" => "/schema" throughout.
export const TypenameSchema = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/)).annotations(
  {
    description: 'Fully qualified globally unique typename',
    example: 'dxos.org/type/Message',
  },
);

/**
 * Semantic version format: `major.minor.patch`
 * Example: `1.0.0`
 */
export const VersionSchema = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/)).annotations({
  description: 'Semantic version format: `major.minor.patch`',
  example: '1.0.0',
});

export const TypeMeta = Schema.Struct({
  typename: TypenameSchema,
  version: VersionSchema,
});

export interface TypeMeta extends Schema.Schema.Type<typeof TypeMeta> {}

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
 * Gets the typename of the object without the version.
 * Returns only the name portion, not the DXN.
 * @example "example.org/type/Contact"
 *
 * @internal (use Obj.getTypename)
 */
export const getTypename = (obj: AnyProperties): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    // Try to extract typename from DXN.
    return getSchemaTypename(schema);
  } else {
    const type = getTypeDXN(obj);
    return type?.asTypeDXN()?.type;
  }
};

/**
 * @internal (use Type.setTypename)
 */
// TODO(dmaretskyi): Rename setTypeDXN.
export const setTypename = (obj: any, typename: DXN): void => {
  invariant(typename instanceof DXN, 'Invalid type.');
  Object.defineProperty(obj, TypeId, {
    value: typename,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/**
 * @returns Object type as {@link DXN}.
 * @returns undefined if the object doesn't have a type.
 * @example `dxn:example.com/type/Person:1.0.0`
 *
 * @internal (use Obj.getTypeDXN)
 */
// TODO(burdon): Narrow type.
export const getTypeDXN = (obj: AnyProperties): DXN | undefined => {
  if (!obj) {
    return undefined;
  }

  const type = (obj as any)[TypeId];
  if (!type) {
    return undefined;
  }

  invariant(type instanceof DXN, 'Invalid object.');
  return type;
};

/**
 * Checks if the object is an instance of the schema.
 * Only typename is compared, the schema version is ignored.
 *
 * The following cases are considered to mean that the object is an instance of the schema:
 *  - Object was created with this exact schema.
 *  - Object was created with a different version of this schema.
 *  - Object was created with a different schema (maybe dynamic) that has the same typename.
 */
// TODO(burdon): Can we use `Schema.is`?
export const isInstanceOf = <Schema extends Schema.Schema.AnyNoContext>(
  schema: Schema,
  object: any,
): object is Schema.Schema.Type<Schema> => {
  if (object == null) {
    return false;
  }

  const schemaDXN = getSchemaDXN(schema);
  if (!schemaDXN) {
    throw new Error('Schema must have an object annotation.');
  }

  const type = getTypeDXN(object);
  if (type && DXN.equals(type, schemaDXN)) {
    return true;
  }

  const typename = getTypename(object);
  if (!typename) {
    return false;
  }

  const typeDXN = schemaDXN.asTypeDXN();
  if (!typeDXN) {
    return false;
  }

  return typeDXN.type === typename;
};

//
// PropertyMeta
//

/**
 * PropertyMeta (metadata for dynamic schema properties).
 * For user-defined annotations.
 */
export const PropertyMetaAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyMeta');

export type PropertyMetaValue = Primitive | Record<string, Primitive> | Primitive[];

export type PropertyMetaAnnotation = {
  [name: string]: PropertyMetaValue;
};

// TODO(wittjosiah): Align with other annotations.
// TODO(wittjosiah): Why is this separate from FormatAnnotation?
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

//
// Reference
//

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');
export type ReferenceAnnotationValue = TypeAnnotation;
export const ReferenceAnnotation = createAnnotationHelper<ReferenceAnnotationValue>(ReferenceAnnotationId);

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
// TODO(burdon): UI concern.
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
