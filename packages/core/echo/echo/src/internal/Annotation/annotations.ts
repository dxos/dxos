//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { SchemaAST, SchemaEx } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, URI } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import type * as Annotation from '../../Annotation';
import { type Mutable } from '../common/proxy';
import { type AnyProperties, EntityKind, TypeId, getSchema } from '../common/types';
import { createAnnotationHelper } from './util';

const ANNOTATION_TYPE_ID: Annotation.TypeId = '~@dxos/echo/Annotation' as const;

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
 * Must be an `echo:` URI.
 */
export const TypeIdentifierAnnotationId = '~@dxos/schema/annotation/TypeIdentifier';

export const getTypeIdentifierAnnotation = (schema: Schema.Top): string | undefined =>
  SchemaAST.getAnnotation<string>(schema.ast, TypeIdentifierAnnotationId);

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
export const getSchemaURI = (schema: Schema.Top): URI.URI | undefined => {
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
  Schema.check(
    Schema.isPattern(
      /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/,
    ),
  ),
).annotate({
  description: 'Fully qualified globally unique typename in reverse-DNS form.',
  example: 'org.dxos.type.message',
});

/**
 * Semantic version format: `major.minor.patch`
 * Example: `1.0.0`
 */
export const VersionSchema = Schema.String.pipe(Schema.check(Schema.isPattern(/^\d+.\d+.\d+$/))).annotate({
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
export const TypeAnnotationId = '~@dxos/schema/annotation/Type';

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
export const TypeAnnotation = TypeMeta.mapFields(
  Struct.assign({
    kind: Schema.Enum(EntityKind),

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
export const getTypeAnnotation = (schema: Schema.Top): TypeAnnotation | undefined => {
  assertArgument(schema != null && schema.ast != null, 'schema', 'invalid schema');
  return SchemaAST.getAnnotation<TypeAnnotation>(schema.ast, TypeAnnotationId);
};

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: Schema.Top): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @internal
 * @returns Schema typename (without dxn: prefix or version number).
 */
export const getSchemaTypename = (schema: Schema.Top): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @internal
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: Schema.Top): string | undefined => getTypeAnnotation(schema)?.version;

/**
 * Gets the typename of the object without the version.
 * Returns only the name portion, not the DXN.
 * @example "com.example.type.contact"
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
export const PropertyMetaAnnotationId = '@dxos/schema/annotation/PropertyMeta';

export type PropertyMetaValue = Primitive | Record<string, Primitive> | Primitive[];

export type PropertyMetaAnnotation = {
  [name: string]: PropertyMetaValue;
};

// TODO(wittjosiah): Align with other annotations.
// TODO(wittjosiah): Why is this separate from FormatAnnotation?
/**
 * Apply property-level metadata to an Effect schema. Only accepts
 * `Schema.Top` — apply BEFORE wrapping the schema with
 * `Type.makeObject` / `Type.makeRelation`. To read property meta off a
 * `Type.Type` entity, unwrap it first with `Type.getSchema(entity)`.
 */
export const PropertyMeta = (name: string, value: PropertyMetaValue) => {
  return <A, I, R>(self: Schema.Codec<A, I, R>): Schema.Codec<A, I, R> => {
    const existingMeta = SchemaAST.getAnnotation<PropertyMetaAnnotation>(self.ast, PropertyMetaAnnotationId);
    return self.annotate({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: SchemaAST.PropertySignature, name: string): T | undefined =>
  SchemaAST.getAnnotation<PropertyMetaAnnotation>(prop.type, PropertyMetaAnnotationId)?.[name] as T | undefined;

//
// Reference
//

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = '@dxos/schema/annotation/Reference';
export type ReferenceAnnotationValue = TypeAnnotation;
export const ReferenceAnnotation = createAnnotationHelper<ReferenceAnnotationValue>(ReferenceAnnotationId);

/**
 * SchemaMeta.
 */
export const SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');
export type SchemaMeta = TypeMeta & { id: string };

/**
 * Identifies a schema as hidden from user-facing surfaces (like dotfiles — visible only via an advanced setting).
 */
export const HiddenAnnotationId = '@dxos/schema/annotation/Hidden';
export const HiddenAnnotation = createAnnotationHelper<boolean>(HiddenAnnotationId);

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
export const LabelAnnotationId = '@dxos/schema/annotation/Label';
export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 * Lower-level version that requires explicit schema parameter.
 * Skips empty strings and whitespace-only strings, continuing to the next field.
 */
// TODO(burdon): Convert to SchemaEx.JsonPath?
export const getLabelWithSchema = <S extends Schema.Top>(
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
    const value = SchemaEx.getField(object, accessor as SchemaEx.JsonPath);
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
// `object` is not typed by the schema: the annotation names the property at runtime, and TypeScript
// cannot index-write a generic type parameter.
export const setLabelWithSchema = (schema: Schema.Top, object: AnyProperties, label: string) => {
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
export const DescriptionAnnotationId = '@dxos/schema/annotation/Description';
export const DescriptionAnnotation = createAnnotationHelper<string>(DescriptionAnnotationId);

/**
 * Returns the description for a given object based on {@link DescriptionAnnotationId}.
 * Lower-level version that requires explicit schema parameter.
 */
// TODO(burdon): Convert to SchemaEx.JsonPath?
export const getDescriptionWithSchema = <S extends Schema.Top>(
  schema: S,
  object: Schema.Schema.Type<S>,
): string | undefined => {
  const accessor = DescriptionAnnotation.get(schema).pipe(Option.getOrElse(() => 'description'));
  assertArgument(typeof accessor === 'string', 'accessor', 'Description annotation must be a string');
  const value = SchemaEx.getField(object, accessor as SchemaEx.JsonPath);
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
export const setDescriptionWithSchema = (schema: Schema.Top, object: AnyProperties, description: string) => {
  const accessorOpt = DescriptionAnnotation.get(schema);
  if (Option.isNone(accessorOpt)) {
    return;
  }
  object[accessorOpt.value] = description;
};

/**
 * Identifies if a property should be included in a form or not.
 * By default, all properties are included in forms, so this is opt-out.
 */
export const FormInputAnnotationId = '@dxos/schema/annotation/FormInput';
export const FormInputAnnotation = createAnnotationHelper<boolean>(FormInputAnnotationId);

/**
 * When set on a `Ref` property, the form renders the referenced object's own
 * fields inline (a nested form bound to the target) instead of a picker.
 */
export const FormInlineAnnotationId = '@dxos/schema/annotation/FormInline';
export const FormInlineAnnotation = createAnnotationHelper<boolean>(FormInlineAnnotationId);

/**
 * When set on a `Ref` (or array-of-`Ref`) property, the form OWNS the referenced target(s): "add" creates a
 * new object of the annotation's typename (instead of opening the existing-object picker) and each target is
 * rendered inline — its own fields — like {@link FormInlineAnnotation}. The target typename is carried here
 * (rather than inferred from the element type) so the field can stay `Ref.Ref(Obj.Unknown)` and avoid pulling
 * the target's type (e.g. query-AST-laden `Trigger`) into the schema's emitted declaration.
 */
export const FormCreateAnnotationId = '@dxos/schema/annotation/FormCreate';
export const FormCreateAnnotation = createAnnotationHelper<string>(FormCreateAnnotationId);

/**
 * When set on an array property, the form renders it as an ordered,
 * drag-to-reorder list (drag handles per row). Element order is meaningful and
 * user-controllable; reordering rewrites the array.
 */
export const FormOrderedAnnotationId = '@dxos/schema/annotation/FormOrdered';
export const FormOrderedAnnotation = createAnnotationHelper<boolean>(FormOrderedAnnotationId);

/**
 * Annotation carrying one or more named layout DSL templates that control how a
 * form arranges a schema's fields (consumed by `@dxos/react-ui-form`'s
 * `Form.Layout` / `Form.FieldSet`). Callers select a variant by name; the
 * implicit name is `DEFAULT_LAYOUT_NAME` (`'default'`).
 *
 * Templates use a minimal XML grammar. Example:
 *
 *   FormLayoutAnnotation.set({
 *     default: `
 *       <grid cols="2">
 *         <field name="origin"/>
 *         <field name="destination"/>
 *         <field name="provider" span="2"/>
 *       </grid>
 *     `,
 *     card: `
 *       <grid cols="1">
 *         <field name="provider"/>
 *         <field name="number"/>
 *       </grid>
 *     `,
 *   })
 */
export const FormLayoutAnnotationId = '@dxos/react-ui-form/annotation/Layout';

export type FormLayoutMap = Record<string, string>;

export const FormLayoutAnnotation = createAnnotationHelper<FormLayoutMap>(FormLayoutAnnotationId);

/** Name used when no explicit form-layout variant is requested. */
export const DEFAULT_LAYOUT_NAME = 'default';

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = '@dxos/schema/annotation/FieldLookup';

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = '@dxos/schema/annotation/Generator';

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
  schema: Schema.Codec<T, any, never>;
  /** Skips the FQN format check on `id`, for a pre-existing id that may already be embedded in persisted schemas. */
  legacyId?: boolean;
}

// Annotation ids use the same NSID / reverse-DNS format as TypenameSchema —
// dot-separated segments, middle segments may be hyphenated, final segment may be camelCase.
// At least 3 segments are required (e.g. org.dxos.annotation.example).
export const makeUserAnnotation = <T>(props: MakeAnnoationsProps<T>): Annotation.Annotation<T> => {
  if (!props.legacyId) {
    assertArgument(
      /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?){2,}(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)?$/.test(
        props.id,
      ),
      'id',
      'Annotation id must be in the FQN format (org.dxos.annotation.example or org.dxos.space.rootCollection). Pass `legacyId: true` to keep an existing non-FQN id.',
    );
  }

  const annotation: Annotation.Annotation<T> = {
    [ANNOTATION_TYPE_ID]: { _Type: {} as T },
    key: props.id as Annotation.Key,
    schema: props.schema,
    get: (schema) => getFromAst(schema.ast, annotation),
    getFromAst: (ast) => getFromAst(ast, annotation),
    set: (value) =>
      PropertyMeta(props.id, Schema.encodeSync(props.schema)(value)) as <S extends Schema.Top>(schema: S) => S,
  };

  return annotation;
};

const IconAnnotationSchema = Schema.Struct({
  /**
   * Phosphor icon name (e.g., 'ph--user--regular', 'ph--cube--regular', 'ph--link--regular ', etc.)
   */
  icon: Schema.String.pipe(Schema.check(Schema.isPattern(/^ph--[a-z-]+--[a-z]+$/))),

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
 * Marks a `Ref` field (or an array-of-`Ref` field) as owning its targets: writing a ref into the
 * field, or creating the holder with one, sets the target's parent to the holding object.
 *
 * This is NOT an invariant: it does not guarantee that a target held here has this object as its
 * parent, only that a write through this field updates the parent. Nothing stops `Obj.setParent`
 * from re-parenting the target afterwards, a ref whose target is not resolved is left alone, and
 * removing a ref does NOT clear the target's parent — a move between holders would otherwise lose
 * the edge depending on write order; call `Obj.setParent(child, undefined)` explicitly. Read the
 * parent with `Obj.getParent`; never infer it from the field.
 *
 * @example
 * ```ts
 * Schema.Struct({
 *   body: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(true)),
 * })
 * ```
 */
export const SetParentAnnotation = makeUserAnnotation<boolean>({
  id: 'org.dxos.annotation.setParent',
  schema: Schema.Boolean,
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
 * Returns the primary label property key for an entity.
 * Reads the first accessor from {@link LabelAnnotation}, defaulting to 'name'.
 */
export const getLabelProperty = (entity: AnyProperties): string => {
  const schema = getSchema(entity);
  if (schema == null) {
    return 'name';
  }
  return LabelAnnotation.get(schema).pipe(
    Option.flatMap((fields) => Option.fromNullishOr(fields[0])),
    Option.getOrElse(() => 'name'),
  );
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

export { Dictionary, Key, getDictionary, setDictionary } from './dictionary';

export const getFromAst = <T>(ast: SchemaAST.AST, annotation: Annotation.Annotation<T>): Option.Option<T> => {
  const meta = SchemaAST.getAnnotation<PropertyMetaAnnotation>(ast, PropertyMetaAnnotationId);
  return Option.fromNullishOr(meta?.[annotation.key]).pipe(Option.map(Schema.decodeUnknownSync(annotation.schema)));
};
