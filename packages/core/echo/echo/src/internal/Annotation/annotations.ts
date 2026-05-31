//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type JsonPath, getField } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, URI } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { type Mutable } from '../common/proxy';
import { type AnyProperties, EntityKind, TypeId, getSchema } from '../common/types';
import { type AnnotationHelper, createAnnotationHelper } from './util';

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
 * @returns The schema's type identifier URI — whichever URI fits.
 *
 * - Stored (dynamic) schemas: the schema-as-object's EID, so loaded objects ride
 *   along with their schema as a strong dependency.
 * - Non-stored (static) schemas: the typename DXN built from `TypeAnnotation`.
 *
 * This URI is what gets written to an object's `system.type`; queries that filter by
 * type also use it (see `Filter.type` / `getTypeURIFromSpecifier`), so both sides
 * stay symmetric without per-schema branching.
 */
export const getSchemaURI = (schema: Schema.Schema.All): URI.URI | undefined => {
  assertArgument(Schema.isSchema(schema), 'schema', 'invalid schema');
  const id = getTypeIdentifierAnnotation(schema);
  if (id) {
    return URI.make(id);
  }
  const objectAnnotation = getTypeAnnotation(schema);
  if (objectAnnotation) {
    return DXN.make(objectAnnotation.typename, objectAnnotation.version);
  }
  return undefined;
};

//
// TypeAnnotation
//

/**
 * Fully qualified globally unique typename.
 * Example: `org.dxos.type.message`
 */
// TODO(wittjosiah): Factor out to DXN spec.
export const TypenameSchema = Schema.String.pipe(
  Schema.pattern(
    /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/,
  ),
).annotations({
  description: 'Fully qualified globally unique typename in reverse-DNS form.',
  example: 'org.dxos.type.message',
});

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
 * @example "org.example.type.contact"
 *
 * @internal (use Obj.getTypename)
 */
export const getTypename = (obj: AnyProperties): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    // Try to extract typename from DXN.
    return getSchemaTypename(schema);
  } else {
    // `obj` may be an arbitrary value (e.g. from `isInstanceOf`); read TypeId
    // directly so we return undefined for non-entities instead of throwing.
    const type = (obj as any)?.[TypeId];
    // Parse the URI string to extract typename.
    if (DXN.isDXN(type)) {
      const parsed = DXN.tryMake(type);
      return parsed && DXN.getName(parsed);
    }
    return undefined;
  }
};

/**
 * @internal (use Type.setTypename)
 */
// TODO(dmaretskyi): Rename setTypeDXN.
export const setTypename = (obj: any, typename: URI.URI): void => {
  assertArgument(typeof typename === 'string', 'typename', 'Invalid type.');
  Object.defineProperty(obj, TypeId, {
    value: typename,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

/**
 * @returns Object type URI — either a typename {@link DXN} or an `echo:` reference to a stored Schema object.
 * @returns undefined if the object has no registered type URI (e.g. unresolved query result).
 * @example `dxn:com.example.type.person:1.0.0`
 * @example `echo:/01KKKG2FHWCMTR0BY00GJSVT1X` (stored schema)
 *
 * @internal (use Obj.getTypeURI)
 */
export const getTypeURI = (obj: AnyProperties): URI.URI | undefined => {
  if (obj == null) {
    return undefined;
  }
  const type = (obj as any)[TypeId];
  if (type == null) {
    return undefined;
  }
  invariant(URI.isURI(type), 'Invalid object.');
  return type;
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
/**
 * Apply property-level metadata to an Effect schema. Only accepts
 * `Schema.Schema.Any` — apply BEFORE wrapping the schema with
 * `Type.makeObject` / `Type.makeRelation`. To read property meta off a
 * `Type.Type` entity, unwrap it first with `Type.getSchema(entity)`.
 */
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
 * Lower-level version that requires explicit schema parameter.
 * Skips empty strings and whitespace-only strings, continuing to the next field.
 */
// TODO(burdon): Convert to JsonPath?
export const getLabelWithSchema = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
): string | undefined => {
  const annotation = LabelAnnotation.get(schema).pipe(Option.getOrElse(() => ['name']));
  for (const accessor of annotation) {
    assertArgument(
      typeof accessor === 'string',
      'accessor',
      'Label annotation must be a string or an array of strings',
    );
    const value = getField(object, accessor as JsonPath);
    switch (typeof value) {
      case 'string': {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return value;
        }
        continue;
      }
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
 * Lower-level version that requires explicit schema parameter.
 */
export const setLabelWithSchema = <S extends Schema.Schema.Any>(
  schema: S,
  object: Schema.Schema.Type<S>,
  label: string,
) => {
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
 * Returns the description for a given object based on {@link DescriptionAnnotationId}.
 * Lower-level version that requires explicit schema parameter.
 */
// TODO(burdon): Convert to JsonPath?
export const getDescriptionWithSchema = <S extends Schema.Schema.Any>(
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
 * Lower-level version that requires explicit schema parameter.
 */
export const setDescriptionWithSchema = <S extends Schema.Schema.Any>(
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

interface MakeAnnoationsProps<T> {
  id: string;
  schema: Schema.Schema<T, any, never>;
}

// TODO(wittjosiah): Comment.
export const makeUserAnnotation = <T>(props: MakeAnnoationsProps<T>): AnnotationHelper<T> => {
  assertArgument(
    /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2,}$/.test(props.id),
    'id',
    'Annotation id must be in the FQN format (org.dxos.annotation.example).',
  );

  const getFromAst = (ast: SchemaAST.AST) =>
    SchemaAST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(ast).pipe(
      Option.flatMap((meta) => Option.fromNullable(meta[props.id])),
      Option.map(Schema.decodeUnknownSync(props.schema)),
    );

  return {
    get: (schema) => getFromAst(schema.ast),
    getFromAst: (ast) => getFromAst(ast),
    set: (value) =>
      PropertyMeta(props.id, Schema.encodeSync(props.schema)(value)) as <S extends Schema.Schema.Any>(schema: S) => S,
  };
};

const IconAnnotationSchema = Schema.Struct({
  /**
   * Phosphor icon name (e.g., 'ph--user--regular', 'ph--cube--regular', 'ph--link--regular ', etc.)
   */
  icon: Schema.String.pipe(Schema.pattern(/^ph--[a-z-]+--[a-z]+$/)),

  /**
   * Color name.
   *
   * List of colors:
   *  - 'red'
   *  - 'orange'
   *  - 'amber'
   *  - 'yellow'
   *  - 'lime'
   *  - 'green'
   *  - 'emerald'
   *  - 'teal'
   *  - 'cyan'
   *  - 'violet'
   *  - 'purple'
   *  - 'fuchsia'
   *  - 'pink'
   *  - 'rose'
   */
  hue: Schema.optional(Schema.String),
});

export interface IconAnnotation extends Schema.Schema.Type<typeof IconAnnotationSchema> {}

/**
 * Icon to render in the UI.
 */
export const IconAnnotation = makeUserAnnotation<IconAnnotation>({
  id: 'org.dxos.annotation.icon',
  schema: IconAnnotationSchema,
});

/**
 * Indicates that this entity's icon should be resolved from a property whose value is a `Ref`
 * to another entity. Consumers (e.g. graph node builders) resolve the ref target and use that
 * target's schema `IconAnnotation` in place of the static one declared on this schema.
 *
 * Useful for wrapper schemas that delegate their visual identity to a referenced sub-entity
 * (e.g. a generic `Game` whose icon should come from its `variant` ref's typed state).
 */
export const IconFromRefAnnotation = makeUserAnnotation<string>({
  id: 'org.dxos.annotation.icon.from-ref',
  schema: Schema.String,
});

/**
 * Options for {@link getLabel}.
 */
export type GetLabelOptions = {
  /**
   * Strategy for deriving a label when the entity has no `LabelAnnotation` value.
   * - `'typename'`: use the entity's typename (e.g. `org.dxos.type.table`).
   *   Useful for Card.Title chrome that must always display something, even
   *   for unlabeled objects.
   */
  fallback?: 'typename';
};

/**
 * Get the label of an entity.
 * Accepts both reactive entities and snapshots.
 *
 * If `options.fallback === 'typename'` and no label is set, returns the
 * entity's typename instead.
 */
export const getLabel = (entity: AnyProperties, options?: GetLabelOptions): string | undefined => {
  const schema = getSchema(entity);
  const label = schema != null ? getLabelWithSchema(schema, entity) : undefined;
  if (label != null) {
    return label;
  }
  if (options?.fallback === 'typename') {
    return getTypename(entity);
  }
  return undefined;
};

/**
 * Set the label of an entity.
 * Must be called within an Obj.update or Relation.update callback.
 */
export const setLabel = (entity: Mutable<AnyProperties>, label: string) => {
  const schema = getSchema(entity);
  if (schema != null) {
    setLabelWithSchema(schema, entity, label);
  }
};

/**
 * Get the description of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getDescription = (entity: AnyProperties): string | undefined => {
  const schema = getSchema(entity);
  if (schema != null) {
    return getDescriptionWithSchema(schema, entity);
  }
};

/**
 * Get the icon annotation for an entity, resolved via its type-level `IconAnnotation`.
 * Accepts both reactive entities and snapshots.
 *
 * Returns the full `{ icon, hue }` annotation so callers can use both the phosphor icon
 * name and the suggested colour. Callers wanting just the icon name typically write
 * `Obj.getIcon(obj)?.icon ?? 'ph--cube--regular'`.
 *
 * Note: this is the "static" icon from the object's own schema. It does not follow
 * `IconFromRefAnnotation` delegation — call sites needing that (e.g. app-graph node
 * builders) should resolve the ref themselves.
 */
export const getIcon = (entity: AnyProperties): IconAnnotation | undefined => {
  const schema = getSchema(entity);
  if (schema == null) {
    return undefined;
  }
  return Option.getOrUndefined(IconAnnotation.get(schema));
};

/**
 * Set the description of an entity.
 * Must be called within an Obj.update or Relation.update callback.
 */
export const setDescription = (entity: Mutable<AnyProperties>, description: string) => {
  const schema = getSchema(entity);
  if (schema != null) {
    setDescriptionWithSchema(schema, entity, description);
  }
};
