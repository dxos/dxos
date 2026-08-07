//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as JSONSchema from 'effect/JsonSchema';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Types from 'effect/Types';

import { raise } from '@dxos/debug';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { clearUndefined, orderKeys, removeProperties } from '@dxos/util';

import type * as Type from '../../Type';
import { type TypeAnnotation, TypeAnnotationId, TypeIdentifierAnnotationId } from '../Annotation/annotations';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util';
import {
  ANY_OBJECT_TYPENAME,
  ANY_OBJECT_VERSION,
  EntityKind,
  EntityKindSchema,
  getStaticTypeSchema,
} from '../common/types';
import { JSON_SCHEMA_ECHO_REF_ID, type JsonSchemaReferenceInfo, createEchoReferenceSchema } from '../Ref';
import { CustomAnnotations, DecodedAnnotations, EchoAnnotations } from './annotations';
import {
  ECHO_ANNOTATIONS_NS_DEPRECATED_KEY,
  ECHO_ANNOTATIONS_NS_KEY,
  type JsonSchemaEchoAnnotations,
  type JsonSchemaType,
  getNormalizedEchoAnnotations,
} from './json-schema-type';

// TODO(burdon): Are these values stored (can they be changed?)
export enum PropType {
  NONE = 0,
  STRING = 1, // TODO(burdon): vs TEXT?
  NUMBER = 2,
  BOOLEAN = 3,
  DATE = 4,
  REF = 5,
  RECORD = 6,
  ENUM = 7,
}

// TODO(burdon): Reconcile with @dxos/schema.
export const toPropType = (type?: PropType): string => {
  switch (type) {
    case PropType.STRING:
      return 'string';
    case PropType.NUMBER:
      return 'number';
    case PropType.BOOLEAN:
      return 'boolean';
    case PropType.DATE:
      return 'date';
    case PropType.REF:
      return 'ref';
    case PropType.RECORD:
      return 'object';
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

const JSON_SCHEMA_URL = 'http://json-schema.org/draft-07/schema#';

export type JsonSchemaOptions = {
  strict?: boolean;
};

/**
 * Convert effect schema to JSON Schema.
 * NOTE: This handles custom annotations.
 * @param schema
 */
// TODO(burdon): Reconcile with possibly extending @effect/Schema/JSONSchema
//  We add additional propertyOrder (but the object properties ARE ordered); and type "string" for literals.
// TODO(wittjosiah): This is mutable because its a pojo, perhaps should be left as readonly at type level though?
export const toJsonSchema = (
  schema: Schema.Top | Type.AnyEntity,
  options: JsonSchemaOptions = {},
): Types.DeepMutable<JsonSchemaType> => {
  // Allow passing a `Type.Type` entity — use its hidden source schema (or its
  // already-built jsonSchema as a fallback).
  const slot = getStaticTypeSchema(schema);
  if (slot != null) {
    schema = slot;
  } else if (!Schema.isSchema(schema)) {
    const entityJsonSchema = (schema as { jsonSchema?: JsonSchemaType }).jsonSchema;
    if (entityJsonSchema != null) {
      return entityJsonSchema as Types.DeepMutable<JsonSchemaType>;
    }
  }
  assertArgument(Schema.isSchema(schema), 'schema');
  let jsonSchema = _toJsonSchemaAST((schema as Schema.Top).ast);
  if (options.strict) {
    // TOOD(burdon): Workaround to ensure JSON schema is valid (for agv parsing).
    jsonSchema = removeProperties(jsonSchema, (key, value) => {
      if (key === '$id' && value === '/schemas/any') {
        return true;
      }
      if (key === '$ref' && value === '#/$defs/dependency') {
        return true;
      }
      if (key === '$ref' && value === '#/$defs/jsonSchema') {
        return true;
      }

      return false;
    });
  }

  return jsonSchema;
};

/**
 * Annotation keys the ECHO encoder emits into JSON schema.
 *
 * Effect 4 dropped v3's merged `jsonSchema` annotation; custom keys are annotated directly and
 * whitelisted here. Deliberately not a broad predicate -- upstream keeps its own annotations on the
 * same record and a permissive filter would leak them into persisted schemas.
 */
const ECHO_JSON_SCHEMA_KEYS = new Set([
  '$id',
  'entityKind',
  'typename',
  'version',
  'relationSource',
  'relationTarget',
  'propertyOrder',
  '$ref',
  'reference',
  ECHO_ANNOTATIONS_NS_KEY,
  ECHO_ANNOTATIONS_NS_DEPRECATED_KEY,
]);

const isEchoJsonSchemaKey = (key: string): boolean =>
  ECHO_JSON_SCHEMA_KEYS.has(key) || Object.hasOwn(CustomAnnotations, key);

const _toJsonSchemaAST = (
  ast: SchemaAST.AST,
  inProgress: Set<SchemaAST.AST> = new Set(),
): Types.DeepMutable<JsonSchemaType> => {
  const withRefinements = withEchoRefinements(ast, '#', new Map(), inProgress);
  // Effect 4 replaced `fromAST` with a document generator that returns the root schema and its
  // definitions separately; `withEchoRefinements` inlines suspends as `#`-refs, so `definitions` is
  // normally empty -- carried over as `$defs` rather than dropped so nothing can vanish silently.
  const { schema, definitions } = Schema.toJsonSchemaDocument(Schema.make(withRefinements), {
    includeAnnotationKey: isEchoJsonSchemaKey,
  });
  const jsonSchema = {
    ...schema,
    ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  } as Types.DeepMutable<JsonSchemaType>;

  return normalizeJsonSchema(jsonSchema);
};

/**
 * Drops the `undefined` member Effect 4 adds to an optional property's type.
 *
 * v4 models `Schema.optional` as `T | undefined` and serializes that as `anyOf: [T, null]`. ECHO's
 * wire contract states an optional property as the bare type, omitted from `required` -- readers
 * (including the LLM tool surface) key off `required`, not a null union.
 */
const stripUndefinedMember = (ast: SchemaAST.AST): SchemaAST.AST => {
  if (!SchemaAST.isUnion(ast)) {
    return ast;
  }
  const defined = ast.types.filter((type) => !SchemaAST.isUndefinedKeyword(type));
  if (defined.length === ast.types.length) {
    return ast;
  }
  return defined.length === 1
    ? SchemaAST.annotate(defined[0], ast.annotations ?? {})
    : new SchemaAST.Union(defined, ast.mode, ast.annotations, ast.checks, ast.encoding, ast.context);
};

const withEchoRefinements = (
  ast: SchemaAST.AST,
  path: string | undefined,
  suspendCache = new Map<SchemaAST.AST, string>(),
  // Suspended ASTs whose expansion is currently in flight — unlike `suspendCache`, this is shared
  // across the fresh caches each new expansion starts with, so it also catches mutual cycles.
  inProgress: Set<SchemaAST.AST> = new Set(),
): SchemaAST.AST => {
  // Generation describes the wire form, and Effect 4 serializes only the encoded side of a
  // transformed schema -- annotations left on the type side are silently dropped. Flattening to the
  // encoded node here, carrying the type-side annotations over, keeps them in the output. Safe
  // because this AST exists only to be serialized.
  if (ast.encoding !== undefined) {
    const typeAnnotations = ast.annotations ?? {};
    ast =
      Object.keys(typeAnnotations).length > 0
        ? SchemaAST.annotate(SchemaAST.toEncoded(ast), typeAnnotations)
        : SchemaAST.toEncoded(ast);
  }

  if (path) {
    suspendCache.set(ast, path);
  }

  let recursiveResult: SchemaAST.AST;
  if (SchemaAST.isSuspend(ast)) {
    // Precompute JSON schema for suspended AST since effect serializer does not support it.
    const suspendedAst = ast.thunk();
    const cachedPath = suspendCache.get(suspendedAst);
    if (cachedPath) {
      recursiveResult = new SchemaAST.Suspend(() => withEchoRefinements(suspendedAst, path, suspendCache, inProgress), {
        [SchemaAST.JSONSchemaAnnotationId]: {
          $ref: cachedPath,
        },
      });
    } else if (inProgress.has(suspendedAst)) {
      // Reached via a *different* suspended type already being expanded (e.g. two mutually-recursive
      // schemas, A embedding B and B embedding A) — `suspendCache` alone won't catch this, since each
      // fresh expansion below starts from an empty one. Stop with a permissive "any" placeholder
      // instead of expanding again. The `type` key is required: effect's JSONSchema.fromAST only
      // treats this annotation as a full override (vs. merging it onto a recomputed, and for a bare
      // Suspend unsupported, structural schema) when it sees type/oneOf/anyOf/$ref.
      recursiveResult = new SchemaAST.Suspend(() => withEchoRefinements(suspendedAst, path, suspendCache, inProgress), {
        [SchemaAST.JSONSchemaAnnotationId]: {
          $id: '/schemas/any',
          type: ['string', 'number', 'boolean', 'object', 'array', 'null'],
        },
      });
    } else {
      inProgress.add(suspendedAst);
      const jsonSchema = _toJsonSchemaAST(suspendedAst, inProgress);
      inProgress.delete(suspendedAst);
      recursiveResult = new SchemaAST.Suspend(() => withEchoRefinements(suspendedAst, path, suspendCache, inProgress), {
        [SchemaAST.JSONSchemaAnnotationId]: jsonSchema,
      });
    }
  } else if (SchemaAST.isTypeLiteral(ast)) {
    // Add property order annotations
    recursiveResult = SchemaEx.mapAst(ast, (ast, key) =>
      withEchoRefinements(
        stripUndefinedMember(ast),
        path && typeof key === 'string' ? `${path}/${key}` : undefined,
        suspendCache,
        inProgress,
      ),
    );
    // Not for a reference: its encoded side is a struct only so that v4 will serialize it, and the
    // `$ref` node it collapses to has no properties to order.
    if (SchemaAST.getAnnotation(ast, '$ref') !== JSON_SCHEMA_ECHO_REF_ID) {
      recursiveResult = addJsonSchemaFields(recursiveResult, {
        propertyOrder: [...ast.propertySignatures.map((p) => p.name)] as string[],
      });
    }
  } else if (SchemaAST.isUndefinedKeyword(ast)) {
    // Ignore undefined keyword that appears in the optional fields.
    return ast;
  } else {
    recursiveResult = SchemaEx.mapAst(ast, (ast, key) =>
      withEchoRefinements(
        ast,
        path && (typeof key === 'string' || typeof key === 'number') ? `${path}/${key}` : undefined,
        suspendCache,
        inProgress,
      ),
    );
  }

  const annotationFields = annotations_toJsonSchemaFields(ast.annotations ?? {});
  if (Object.keys(annotationFields).length === 0) {
    return recursiveResult;
  } else {
    return addJsonSchemaFields(recursiveResult, annotationFields);
  }
};

/**
 * Convert JSON schema to effect schema.
 * @param root
 * @param definitions
 */
export const toEffectSchema = (root: JsonSchemaType, _defs?: JsonSchemaType['$defs']): Schema.Codec<any, any> => {
  const defs = root.$defs ? { ..._defs, ...root.$defs } : (_defs ?? {});
  if ('type' in root && root.type === 'object') {
    return objectToEffectSchema(root, defs);
  }

  let result: Schema.Codec<any, any> = Schema.Unknown;
  if ('$ref' in root) {
    switch (root.$ref) {
      case '/schemas/echo/ref': {
        result = refToEffectSchema(root);
        break;
      }
    }
  } else if ('$id' in root) {
    switch (decodeURIComponent(root.$id as string)) {
      case '/schemas/any': {
        result = anyToEffectSchema(root as JSONSchema.JsonSchema);
        break;
      }
      case '/schemas/unknown': {
        result = Schema.Unknown;
        break;
      }
      case '/schemas/{}':
      case '/schemas/object': {
        result = Schema.Struct({});
        break;
      }
      // Custom ECHO object reference.
      case '/schemas/echo/ref': {
        result = refToEffectSchema(root);
        break;
      }
    }
  } else if ('enum' in root) {
    result = Schema.Union(root.enum!.map((e) => Schema.Literal(e)));
  } else if ('oneOf' in root) {
    result = Schema.Union(root.oneOf!.map((v) => toEffectSchema(v, defs)));
  } else if ('anyOf' in root) {
    result = Schema.Union(root.anyOf!.map((v) => toEffectSchema(v, defs)));
  } else if ('allOf' in root) {
    if (root.allOf!.length === 1) {
      result = toEffectSchema(root.allOf![0], defs);
    } else {
      log.warn('allOf with multiple schemas is not supported');
      result = Schema.Unknown;
    }
  } else if ('type' in root) {
    switch (root.type) {
      case 'string': {
        // Applied on `Schema.String` rather than the widened `result`, since v4 types the check
        // against the schema it constrains.
        result = root.pattern ? Schema.String.check(Schema.isPattern(new RegExp(root.pattern))) : Schema.String;
        break;
      }
      case 'number': {
        result = Schema.Number;
        break;
      }
      case 'integer': {
        result = Schema.Number.pipe(Schema.check(Schema.isInt()));
        break;
      }
      case 'boolean': {
        result = Schema.Boolean;
        break;
      }
      case 'array': {
        if (Array.isArray(root.items)) {
          const [required, optional] = Function.pipe(
            root.items,
            Array.map((v) => toEffectSchema(v as JsonSchemaType, defs)),
            Array.splitAt(root.minItems ?? root.items.length),
          );
          result = Schema.Tuple([...required, ...optional.map(Schema.optionalKey)]);
        } else {
          invariant(root.items);
          const items = root.items;
          result = Array.isArray(items)
            ? Schema.Tuple(items.map((v) => toEffectSchema(v as JsonSchemaType, defs)))
            : Schema.Array(toEffectSchema(items as JsonSchemaType, defs));
        }
        break;
      }
      case 'null': {
        result = Schema.Null;
        break;
      }
    }
  } else if ('$ref' in root) {
    const refSegments = root.$ref!.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    result = toEffectSchema(jsonSchema, defs).pipe(
      Schema.annotate({ identifier: refSegments[refSegments.length - 1] }),
    );
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);

  // Skipped when empty: v4 records the empty object rather than leaving `annotations` undefined,
  // which makes a round-tripped node structurally different from a freshly built one.
  if (Object.keys(annotations).length > 0) {
    result = result.annotate(annotations);
  }

  return result;
};

const objectToEffectSchema = (root: JsonSchemaType, defs: JsonSchemaType['$defs']): Schema.Codec<any, any> => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);

  const echoRefinement: JsonSchemaEchoAnnotations = (root as any)[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
  const isEchoObject =
    echoRefinement != null || ('$id' in root && typeof root.$id === 'string' && root.$id.startsWith('dxn:'));

  let fields: Record<string, Schema.Codec<any, any>> = {};
  const propertyList = Object.entries(root.properties ?? {});
  let immutableIdField: Schema.Codec<any, any> | undefined;
  for (const [key, value] of propertyList) {
    if (isEchoObject && key === 'id') {
      immutableIdField = toEffectSchema(value, defs);
    } else {
      // TODO(burdon): Mutable cast.
      // `optionalKey`, not `optional`: the latter adds `| undefined` to the value type, and in v4
      // that union is already carried by the serialized type -- wrapping again nests a second one.
      (fields as any)[key] = root.required?.includes(key)
        ? toEffectSchema(value, defs)
        : Schema.optionalKey(toEffectSchema(value, defs));
    }
  }

  if (root.propertyOrder) {
    fields = orderKeys(fields, root.propertyOrder as any);
  }

  // The id field is folded into the struct fields rather than assigned afterwards: `mapFields` is a
  // struct operation, and the record branches below produce schemas that do not carry it.
  const structFields: Record<string, Schema.Codec<any, any>> = immutableIdField
    ? { id: immutableIdField, ...fields }
    : fields;

  let schema: Schema.Codec<any, any>;
  if (root.patternProperties) {
    invariant(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
    invariant(
      Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '',
      'only one pattern property is supported',
    );

    schema = Schema.Record(Schema.String, toEffectSchema(root.patternProperties[''], defs));
  } else if (typeof root.additionalProperties !== 'object' || root.additionalProperties === null) {
    schema = Schema.Struct(structFields);
  } else {
    const indexValue = toEffectSchema(root.additionalProperties as JsonSchemaType, defs);
    if (propertyList.length > 0) {
      // v4 spells "struct plus an index signature" as `StructWithRest`.
      schema = Schema.StructWithRest(Schema.Struct(structFields), [Schema.Record(Schema.String, indexValue)]);
    } else {
      schema = Schema.Record(Schema.String, indexValue);
    }
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);
  return (Object.keys(annotations).length > 0 ? schema.annotate(annotations) : schema) as any;
};

const anyToEffectSchema = (root: JSONSchema.JsonSchema): Schema.Codec<any, any> => {
  const echoRefinement: JsonSchemaEchoAnnotations = (root as any)[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
  // TODO(dmaretskyi): Is this branch still taken?
  if ((echoRefinement as any)?.reference != null) {
    const echoUri = typeof root.$id === 'string' && root.$id.startsWith('echo:') ? root.$id : undefined;
    return createEchoReferenceSchema(
      echoUri,
      (echoRefinement as any).reference.typename,
      (echoRefinement as any).reference.version,
    );
  }

  return Schema.Any;
};

// TODO(dmaretskyi): Types.
const refToEffectSchema = (root: any): Schema.Codec<any, any> => {
  if (!('reference' in root)) {
    // Fallback to generic object ref when no reference info is provided.
    return createEchoReferenceSchema(undefined, ANY_OBJECT_TYPENAME, ANY_OBJECT_VERSION);
  }

  const reference: JsonSchemaReferenceInfo = root.reference;
  if (typeof reference !== 'object') {
    throw new Error('Invalid reference field in ref schema');
  }

  const ref = reference.schema.$ref;
  const targetSchemaDXN = DXN.tryMake(ref);
  invariant(targetSchemaDXN, `Expected a type DXN, got: ${ref}`);

  return createEchoReferenceSchema(ref, DXN.getName(targetSchemaDXN), reference.schemaVersion);
};

//
// Annotations
//

const annotations_toJsonSchemaFields = (annotations: SchemaAST.Annotations): Record<symbol, any> => {
  const schemaFields: Record<string, any> = {};

  const echoAnnotations: Types.Mutable<JsonSchemaEchoAnnotations> = {};
  for (const [key, annotationId] of Object.entries(EchoAnnotations)) {
    if (annotations[annotationId] != null) {
      echoAnnotations[key as keyof JsonSchemaEchoAnnotations] = annotations[annotationId] as any;
    }
  }
  if (Object.keys(echoAnnotations).length > 0) {
    // TODO(dmaretskyi): use new namespace.
    schemaFields[ECHO_ANNOTATIONS_NS_KEY] = echoAnnotations;
  }

  // For stored schemas the storage URI is the definitive identifier — it overrides
  // the typename `$id` written above.
  const echoIdentifier = annotations[TypeIdentifierAnnotationId];
  if (echoIdentifier) {
    schemaFields.$id = echoIdentifier;
  }

  // Custom (at end).
  for (const [key, annotationId] of Object.entries(CustomAnnotations)) {
    const value = annotations[annotationId];
    if (value != null) {
      schemaFields[key] = value;
    }
  }

  return schemaFields;
};

const decodeTypeIdentifierAnnotation = (schema: JsonSchemaType): string | undefined => {
  // For stored schemas `$id` IS the storage URI (echo:/<id>).
  if (schema.$id && schema.$id.startsWith('echo:')) {
    return schema.$id;
  }
  // Older serializations stored the EID on echo.type.schemaId.
  const legacySchemaId = schema.echo?.type?.schemaId;
  if (legacySchemaId) {
    return EntityId.isValid(legacySchemaId) ? EID.make({ entityId: legacySchemaId }) : legacySchemaId;
  }
  return undefined;
};

const decodeTypeAnnotation = (schema: JsonSchemaType): TypeAnnotation | undefined => {
  if (schema.typename) {
    const annotation: Types.Mutable<TypeAnnotation> = {
      // TODO(dmaretskyi): Decoding default.
      kind: schema.entityKind ? Schema.decodeSync(EntityKindSchema)(schema.entityKind) : EntityKind.Object,
      typename: schema.typename,
      version: schema.version ?? '0.1.0',
    };

    if (annotation.kind === EntityKind.Relation) {
      const source = schema.relationSource?.$ref ?? raise(new Error('Relation source not set'));
      const target = schema.relationTarget?.$ref ?? raise(new Error('Relation target not set'));
      annotation.sourceSchema = DXN.tryMake(source) ?? raise(new Error(`Invalid relation source: ${source}`));
      annotation.targetSchema = DXN.tryMake(target) ?? raise(new Error(`Invalid relation target: ${target}`));
    }

    return annotation;
  }

  // Decode legacy schema.
  if (!schema.typename && schema?.echo?.type) {
    return {
      kind: EntityKind.Object,
      typename: schema.echo.type.typename,
      version: schema.echo.type.version,
    };
  }

  return undefined;
};

const jsonSchemaFieldsToAnnotations = (schema: JsonSchemaType): SchemaAST.Annotations => {
  const annotations: Types.Mutable<Schema.Annotations.Annotations> = {};

  const echoAnnotations: JsonSchemaEchoAnnotations = getNormalizedEchoAnnotations(schema) ?? {};
  if (echoAnnotations) {
    for (const [key, annotationId] of Object.entries(EchoAnnotations)) {
      if (echoAnnotations[key as keyof JsonSchemaEchoAnnotations]) {
        annotations[annotationId] = echoAnnotations[key as keyof JsonSchemaEchoAnnotations];
      }
    }
  }

  const typeIdentifier = decodeTypeIdentifierAnnotation(schema);
  annotations[TypeIdentifierAnnotationId] = typeIdentifier;
  const typeAnnotation = decodeTypeAnnotation(schema);
  if (typeAnnotation) {
    annotations[TypeAnnotationId] = typeAnnotation;
    Object.assign(
      annotations,
      makeTypeJsonSchemaAnnotation({
        // $id is the typename DXN — the schema's type identity. The storage EID (if any)
        // is preserved separately on TypeIdentifierAnnotation / echo.schemaId.
        identifier: DXN.make(typeAnnotation.typename, typeAnnotation.version),
        kind: typeAnnotation.kind,
        typename: typeAnnotation.typename,
        version: typeAnnotation.version,
        relationSource: typeAnnotation.sourceSchema,
        relationTarget: typeAnnotation.targetSchema,
      }),
    );
  }

  // Custom (at end).
  for (const [key, annotationId] of Object.entries({ ...CustomAnnotations, ...DecodedAnnotations })) {
    if (key in schema) {
      annotations[annotationId] = (schema as any)[key];
    }
  }

  return clearUndefined(annotations);
};

// The fields are annotated under their own keys rather than nested: Effect 4 emits whitelisted
// annotation keys straight into the generated schema (see `isEchoJsonSchemaKey`) and no longer
// merges a `jsonSchema` annotation object.
const addJsonSchemaFields = (ast: SchemaAST.AST, schema: JsonSchemaType): SchemaAST.AST =>
  SchemaAST.annotate(ast, schema as SchemaAST.Annotations);

/**
 * Fixes field order.
 * Sets `$schema` prop.
 */
/**
 * Inlines the `allOf` wrapper Effect 4 emits for checks.
 *
 * v3 merged a refinement's keywords into the node; v4 nests them under `allOf`. ECHO's wire contract
 * -- which the LLM tool surface reads directly -- states constraints at the property's top level,
 * so the branches are merged back in. Only pure keyword branches are inlined; anything carrying its
 * own `type` or `$ref` is a real composition and stays put.
 */
const inlineAllOf = (node: Record<string, any>): Record<string, any> => {
  if (!Array.isArray(node.allOf)) {
    return node;
  }
  const inlinable = node.allOf.filter(
    (branch: any) => branch && typeof branch === 'object' && !('type' in branch) && !('$ref' in branch),
  );
  if (inlinable.length !== node.allOf.length) {
    return node;
  }
  const { allOf, ...rest } = node;
  return Object.assign(rest, ...inlinable);
};

/**
 * Collapses an ECHO reference back to its `$ref` form.
 *
 * The reference's encoded side is a struct so that Effect 4 will serialize it at all (declarations
 * have no JSON schema representation), but that also emits the `{ '/': string }` shape. A JSON
 * Schema `$ref` node carries no sibling structural keywords, and ECHO readers match on `$ref`, so
 * the structural keys are dropped. Keyed on ECHO's own reference id, so no other node is affected.
 */
const collapseEchoRef = (node: Record<string, any>): Record<string, any> => {
  if (node.$ref !== JSON_SCHEMA_ECHO_REF_ID) {
    return node;
  }
  const { type, properties, required, additionalProperties, ...rest } = node;
  return rest;
};

/** Applies {@link inlineAllOf} to a node and every nested schema position. */
const inlineAllOfDeep = (node: any): any => {
  if (Array.isArray(node)) {
    return node.map(inlineAllOfDeep);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }
  const inlined = collapseEchoRef(inlineAllOf(node));
  for (const [key, value] of Object.entries(inlined)) {
    if (value && typeof value === 'object') {
      inlined[key] = inlineAllOfDeep(value);
    }
  }
  return inlined;
};

const normalizeJsonSchema = (jsonSchema: Types.DeepMutable<JsonSchemaType>): Types.DeepMutable<JsonSchemaType> => {
  jsonSchema = inlineAllOfDeep(jsonSchema);
  if (jsonSchema.properties && 'id' in jsonSchema.properties) {
    jsonSchema.properties = orderKeys(jsonSchema.properties, ['id']); // Put id first.
  }

  // TODO(dmaretskyi): Makes sure undefined is not left on optional fields for the resulting object.
  jsonSchema.$schema = JSON_SCHEMA_URL;
  jsonSchema = orderKeys(jsonSchema, [
    '$schema',
    '$id',

    'entityKind',
    'typename',
    'version',
    'relationTarget',
    'relationSource',

    'type',
    'enum',

    'properties',
    'required',
    'propertyOrder', // Custom.
    'items',
    'additionalProperties',

    'anyOf',
    'oneOf',
  ]);
  return jsonSchema;
};
