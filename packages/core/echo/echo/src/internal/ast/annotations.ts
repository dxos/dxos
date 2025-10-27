//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { createAnnotationHelper } from './annotation-helper';
import { EntityKind } from './entity-kind';

/**
 * If property is optional returns the nested property, otherwise returns the property.
 */
// TODO(wittjosiah): Is there a way to do this as a generic?
export const unwrapOptional = (property: SchemaAST.PropertySignature) => {
  if (!property.isOptional || !SchemaAST.isUnion(property.type)) {
    return property;
  }

  return property.type.types[0];
};

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
 * ECHO type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

// TODO(burdon): Create echo-schema Format types.
// TODO(burdon): Reconcile with "short" DXN.
export const Typename = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
export const SchemaVersion = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/));

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const TypeAnnotation = Schema.Struct({
  kind: Schema.Enums(EntityKind),
  typename: Typename,
  version: SchemaVersion,

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
 * @deprecated Use {@link Type.getTypename} instead.
 * @returns Schema typename (without dxn: prefix or version number).
 */
export const getSchemaTypename = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @deprecated Use {@link Type.getVersion} instead.
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
 * Identifies a schema as a view.
 */
export const ViewAnnotationId = Symbol.for('@dxos/schema/annotation/View');
export const ViewAnnotation = createAnnotationHelper<boolean>(ViewAnnotationId);

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');
export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

/**
 * Identifies description property or JSON path expression.
 * A string representing field accessor.
 */
export const DescriptionAnnotationId = Symbol.for('@dxos/schema/annotation/Description');
export const DescriptionAnnotation = createAnnotationHelper<string>(DescriptionAnnotationId);

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
 * @deprecated Use `Type.getDXN`.
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
