//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as JSONSchema from 'effect/JsonSchema';
import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { raise } from '@dxos/debug';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { clearUndefined, orderKeys, removeProperties } from '@dxos/util';

import type * as Type from '../../Type.ts';
import { type TypeAnnotation, TypeAnnotationId, TypeIdentifierAnnotationId } from '../Annotation/annotations.ts';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util.ts';
import {
  ANY_OBJECT_TYPENAME,
  ANY_OBJECT_VERSION,
  EntityKind,
  EntityKindSchema,
  getStaticTypeSchema,
} from '../common/types/index.ts';
import { JSON_SCHEMA_ECHO_REF_ID, type JsonSchemaReferenceInfo, createEchoReferenceSchema } from '../Ref/index.ts';
import { CustomAnnotations, DecodedAnnotations, EchoAnnotations } from './annotations.ts';
import {
  ECHO_ANNOTATIONS_NS_DEPRECATED_KEY,
  ECHO_ANNOTATIONS_NS_KEY,
  type JsonSchemaEchoAnnotations,
  type JsonSchemaType,
  getNormalizedEchoAnnotations,
} from './json-schema-type.ts';

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

const _toJsonSchemaAST = (ast: SchemaAST.AST): Types.DeepMutable<JsonSchemaType> => {
  // `toCodecJson` first: it materializes the JSON encoding Effect 4 would otherwise apply *inside*
  // the serializer, where the type-side annotations are dropped (a bare `Schema.Number` encodes to
  // `number | "NaN" | ±"Infinity"` and loses its title, format and ECHO annotations). Materializing
  // it here lets the encoding flattening below carry those annotations onto the encoded node.
  const withRefinements = withEchoRefinements(Schema.toCodecJson(Schema.make(ast)).ast, new Map());
  // Effect 4 replaced `fromAST` with a document generator that returns the root schema and its
  // definitions separately; only a genuinely cyclic schema produces definitions (an acyclic suspend
  // is inlined), and they are carried over as `$defs` rather than dropped.
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
  // Recursive: `Schema.optional` is not idempotent in v4, so an already-optional field made optional
  // again nests as `(T | undefined) | undefined` and one pass would leave the inner union behind.
  return defined.length === 1
    ? SchemaAST.annotate(stripUndefinedMember(defined[0]), ast.annotations ?? {})
    : new SchemaAST.Union(
        defined.map(stripUndefinedMember),
        ast.mode,
        ast.annotations,
        ast.checks,
        ast.encoding,
        ast.context,
      );
};

/**
 * Rewrites an AST into the shape ECHO serializes.
 *
 * `expansions` memoizes the rewrite of every suspended body so that re-entering a cycle yields the
 * *same* node object. Effect 4's serializer walks suspends eagerly and terminates on node identity;
 * a thunk that rebuilt its body on each call would recurse until the stack blew.
 */
const withEchoRefinements = (ast: SchemaAST.AST, expansions: Map<SchemaAST.AST, SchemaAST.AST>): SchemaAST.AST => {
  // Generation describes the wire form, and Effect 4 serializes only the encoded side of a
  // transformed schema -- annotations left on the type side are silently dropped. Flattening to the
  // encoded node here, carrying the type-side annotations over, keeps them in the output. Safe
  // because this AST exists only to be serialized.
  if (ast.encoding !== undefined) {
    const typeAnnotations = SchemaAST.resolveAnnotations(ast) ?? {};
    ast =
      Object.keys(typeAnnotations).length > 0
        ? SchemaAST.annotate(SchemaAST.toEncoded(ast), typeAnnotations)
        : SchemaAST.toEncoded(ast);
  }

  let recursiveResult: SchemaAST.AST;
  if (SchemaAST.isSuspend(ast)) {
    const suspendedAst = ast.thunk();
    const expand = () => {
      const cached = expansions.get(suspendedAst);
      if (cached) {
        return cached;
      }
      const expanded = withEchoRefinements(suspendedAst, expansions);
      expansions.set(suspendedAst, expanded);
      return expanded;
    };
    recursiveResult = new SchemaAST.Suspend(expand, ast.annotations, undefined, ast.encoding, ast.context);
  } else if (SchemaAST.isObjects(ast)) {
    // Add property order annotations
    recursiveResult = SchemaEx.mapAst(ast, (ast) => withEchoRefinements(stripUndefinedMember(ast), expansions));
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
    recursiveResult = SchemaEx.mapAst(ast, (ast) => withEchoRefinements(ast, expansions));
  }

  const annotationFields = annotations_toJsonSchemaFields(SchemaAST.resolveAnnotations(ast) ?? {});
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
/**
 * Whether the node is an ECHO reference, by either spelling of the sentinel.
 *
 * Checked before structural keywords so that a reference is never mistaken for the plain object
 * its encoded side looks like.
 */
const isEchoReferenceNode = (node: JsonSchemaType): boolean =>
  ('$ref' in node && node.$ref === JSON_SCHEMA_ECHO_REF_ID) ||
  ('$id' in node && decodeURIComponent(node.$id as string) === JSON_SCHEMA_ECHO_REF_ID);

/**
 * Memoizes the decode of every `$defs` entry within one `toEffectSchema` call, keyed by definition
 * name. A definition is only ever reached through a `$ref`, and a `$ref` is only emitted for a
 * genuine cycle, so re-entry must resolve to the in-flight placeholder rather than expand the body
 * again -- the mirror of the `expansions` map on the encode side.
 */
type Expansions = Map<string, Schema.Codec<any, any>>;

export const toEffectSchema = (root: JsonSchemaType, _defs?: JsonSchemaType['$defs']): Schema.Codec<any, any> =>
  toEffectSchemaRec(root, _defs, new Map());

const toEffectSchemaRec = (
  root: JsonSchemaType,
  _defs: JsonSchemaType['$defs'] | undefined,
  expansions: Expansions,
): Schema.Codec<any, any> => {
  const defs = root.$defs ? { ..._defs, ...root.$defs } : (_defs ?? {});

  // Tested before the generic object branch: a reference structurally *is* an object, so one that
  // arrives carrying `type: 'object'` (a widened wire schema, or a hand-written one) would match
  // that branch first and rebuild as a plain `{ '/': string }` struct, silently losing the
  // reference semantics.
  const isReference = isEchoReferenceNode(root);
  if (!isReference && 'type' in root && root.type === 'object') {
    return objectToEffectSchema(root, defs, expansions);
  }

  let result: Schema.Codec<any, any> = Schema.Unknown;
  if (isReference) {
    // Assigned rather than returned so the annotation handling below still runs: a reference
    // carrying `title`/`description` must keep it through the round trip.
    result = refToEffectSchema(root);
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
    }
  } else if ('enum' in root) {
    result = Schema.Union(root.enum!.map((e) => Schema.Literal(e)));
  } else if ('oneOf' in root) {
    result = Schema.Union(root.oneOf!.map((v) => toEffectSchemaRec(v, defs, expansions)));
  } else if ('anyOf' in root) {
    result = Schema.Union(root.anyOf!.map((v) => toEffectSchemaRec(v, defs, expansions)));
  } else if ('allOf' in root) {
    if (root.allOf!.length === 1) {
      result = toEffectSchemaRec(root.allOf![0], defs, expansions);
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
            Array.map((v) => toEffectSchemaRec(v as JsonSchemaType, defs, expansions)),
            Array.splitAt(root.minItems ?? root.items.length),
          );
          result = Schema.Tuple([...required, ...optional.map(Schema.optionalKey)]);
        } else if (root.items === undefined) {
          // v4 emits a bare `{ type: 'array' }` for an unconstrained array; v3 always wrote `items`.
          result = Schema.Array(Schema.Unknown);
        } else {
          const items = root.items;
          result = Array.isArray(items)
            ? Schema.Tuple(items.map((v) => toEffectSchemaRec(v as JsonSchemaType, defs, expansions)))
            : Schema.Array(toEffectSchemaRec(items as JsonSchemaType, defs, expansions));
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
    const name = refSegments[refSegments.length - 1];
    const cached = expansions.get(name);
    if (cached) {
      result = cached;
    } else {
      const jsonSchema = defs[name];
      invariant(jsonSchema, `missing definition for ${root.$ref}`);
      // The placeholder is registered *before* descending: a `$ref` back to this definition from
      // inside its own body resolves to the thunk, which closes the cycle instead of expanding it
      // again. Replaced by the expanded node afterwards so a later, non-cyclic `$ref` inlines
      // directly and the outermost node stays a plain struct (keeping the round trip lossless).
      let expanded: Schema.Codec<any, any> | undefined;
      expansions.set(
        name,
        Schema.suspend(() => {
          invariant(expanded, `unresolved definition for ${root.$ref}`);
          return expanded;
        }).pipe(Schema.annotate({ identifier: name })),
      );
      expanded = toEffectSchemaRec(jsonSchema, defs, expansions).pipe(Schema.annotate({ identifier: name }));
      expansions.set(name, expanded);
      result = expanded;
    }
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);

  // Skipped when empty: v4 records the empty object rather than leaving `annotations` undefined,
  // which makes a round-tripped node structurally different from a freshly built one.
  if (Object.keys(annotations).length > 0) {
    result = result.annotate(annotations);
  }

  return result;
};

const objectToEffectSchema = (
  root: JsonSchemaType,
  defs: JsonSchemaType['$defs'],
  expansions: Expansions,
): Schema.Codec<any, any> => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);

  const echoRefinement: JsonSchemaEchoAnnotations = (root as any)[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
  const isEchoObject =
    echoRefinement != null || ('$id' in root && typeof root.$id === 'string' && root.$id.startsWith('dxn:'));

  let fields: Record<string, Schema.Codec<any, any>> = {};
  const propertyList = Object.entries(root.properties ?? {});
  let immutableIdField: Schema.Codec<any, any> | undefined;
  for (const [key, value] of propertyList) {
    if (isEchoObject && key === 'id') {
      immutableIdField = toEffectSchemaRec(value, defs, expansions);
    } else {
      // TODO(burdon): Mutable cast.
      // `optionalKey`, not `optional`: the latter unions the value with `undefined`, which would put
      // every annotation one level below `PropertySignature.type` where the readers look for it.
      (fields as any)[key] = root.required?.includes(key)
        ? toEffectSchemaRec(value, defs, expansions)
        : Schema.optionalKey(toEffectSchemaRec(value, defs, expansions));
    }
  }

  if (root.propertyOrder) {
    fields = orderKeys(fields, root.propertyOrder as any);
  }

  // The id field is folded into the struct fields rather than assigned afterwards: `mapFields` is a
  // struct operation, and the record branches below produce schemas that do not carry it. Appended
  // last to match where `Type.makeObject` puts it, so a serialize/deserialize cycle is order-stable.
  const structFields: Record<string, Schema.Codec<any, any>> = immutableIdField
    ? { ...fields, id: immutableIdField }
    : fields;

  let schema: Schema.Codec<any, any>;
  if (root.patternProperties) {
    invariant(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
    invariant(
      Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '',
      'only one pattern property is supported',
    );

    schema = Schema.Record(Schema.String, toEffectSchemaRec(root.patternProperties[''], defs, expansions));
  } else if (
    root.additionalProperties !== true &&
    (typeof root.additionalProperties !== 'object' || root.additionalProperties === null)
  ) {
    schema = Schema.Struct(structFields);
  } else {
    // `true` states an open record without constraining its values, which is how an unconstrained
    // value type serializes; anything else is the value's own schema.
    const indexValue =
      root.additionalProperties === true
        ? Schema.Any
        : toEffectSchemaRec(root.additionalProperties as JsonSchemaType, defs, expansions);
    if (propertyList.length > 0) {
      // v4 spells "struct plus an index signature" as `StructWithRest`.
      schema = Schema.StructWithRest(Schema.Struct(structFields), [Schema.Record(Schema.String, indexValue)]);
    } else {
      schema = Schema.Record(Schema.String, indexValue);
    }
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);
  return Object.keys(annotations).length > 0 ? schema.annotate(annotations) : schema;
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
 * Restores the `additionalProperties` of an open record or a struct's open rest signature.
 *
 * v4 omits it when an index signature's value type is unconstrained (`Any`/`Unknown` serialize to the
 * empty schema) — for a bare record and for `StructWithRest` alike. Absent `additionalProperties`
 * means "anything allowed" in JSON Schema, but ECHO's decoder keys record-ness off the field's
 * presence, so the round-trip rebuilt a closed struct and the open keys were silently dropped. The
 * omission is unambiguous: a closed struct always carries `additionalProperties: false` explicitly,
 * a constrained index signature carries its value schema, and an empty struct arrives as the `anyOf`
 * pair `restoreEmptyObject` handles — only a dropped unconstrained signature lacks the key.
 */
const restoreOpenRecord = (node: Record<string, any>): Record<string, any> => {
  if (node.type !== 'object' || 'additionalProperties' in node) {
    return node;
  }
  return { ...node, additionalProperties: true };
};

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
    (branch: any) =>
      branch &&
      typeof branch === 'object' &&
      // A reference structurally is an object yet is still a plain keyword contribution, so one
      // that arrives carrying `type: 'object'` (a widened wire schema) stays inlinable; without the
      // exemption an annotated reference keeps its `allOf` wrapper and loses the sibling annotation
      // that prompted the wrapper.
      (isEchoReferenceNode(branch) || !('type' in branch)) &&
      // ECHO's reference sentinel is not a JSON Schema pointer into a definitions map, so a branch
      // carrying it is still a plain keyword contribution.
      (!('$ref' in branch) || branch.$ref === JSON_SCHEMA_ECHO_REF_ID),
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
 * have no JSON schema representation), but that also emits the `{ '/': string }` shape. The
 * structural keys are dropped to keep the serialized form identical to what existing readers and
 * persisted schemas already carry — adding `type: 'object'` here would change the stored
 * representation of every echo type that embeds a reference, and an older `toEffectSchema` matches
 * the generic object branch before the sentinel, silently rebuilding such a reference as a plain
 * struct. Consumers that need the structural keywords (e.g. an MCP tool schema read by a language
 * model) add them at their own wire boundary instead. Keyed on ECHO's own reference id, so no
 * other node is affected.
 */
const collapseEchoRef = (node: Record<string, any>): Record<string, any> => {
  if (node.$ref !== JSON_SCHEMA_ECHO_REF_ID) {
    return node;
  }
  const { type, properties, required, additionalProperties, ...rest } = node;
  return rest;
};

/** The string forms Effect 4 adds to `Schema.Number` so non-finite values survive JSON. */
const NON_FINITE_LITERALS = ['Infinity', '-Infinity', 'NaN'];

/**
 * Collapses v4's `number | non-finite-string` union back to a plain number.
 *
 * ECHO never stored non-finite numbers, and leaving the union in place breaks round-trip fidelity:
 * a `Schema.Number` field would come back as a union after one serialize/deserialize cycle, and
 * again on the next.
 */
const collapseNumberUnion = (node: Record<string, any>): Record<string, any> => {
  if (!Array.isArray(node.anyOf) || node.anyOf.length !== 2) {
    return node;
  }
  const [first, second] = node.anyOf as [Record<string, any>, Record<string, any>];
  // The numeric branch carries the node's own keywords (`multipleOf`, `format`, ...) when the number
  // is refined, so it is merged up rather than discarded -- dropping it would strip the constraints.
  const isNumber = first?.type === 'number' || first?.type === 'integer';
  const isNonFinite =
    second?.type === 'string' &&
    Array.isArray(second.enum) &&
    second.enum.length === NON_FINITE_LITERALS.length &&
    NON_FINITE_LITERALS.every((literal) => second.enum.includes(literal));
  if (!isNumber || !isNonFinite) {
    return node;
  }
  const { anyOf, ...rest } = node;
  return { ...first, ...rest };
};

/**
 * Restores the object form Effect 4 drops for a struct with no properties.
 *
 * v4 serializes an empty `Objects` node as `anyOf: [object, array]` -- the shape of the bare
 * `object` keyword -- which reads back as a union rather than a struct. Keyed on `propertyOrder`,
 * which ECHO writes for every struct and never for the keyword, so no other node is affected.
 */
const restoreEmptyObject = (node: Record<string, any>): Record<string, any> => {
  if (!Array.isArray(node.anyOf) || node.anyOf.length !== 2 || !Array.isArray(node.propertyOrder)) {
    return node;
  }
  const [first, second] = node.anyOf as [Record<string, any>, Record<string, any>];
  if (first?.type !== 'object' || Object.keys(first).length !== 1) {
    return node;
  }
  if (second?.type !== 'array' || Object.keys(second).length !== 1) {
    return node;
  }
  const { anyOf, ...rest } = node;
  return { type: 'object', properties: {}, additionalProperties: false, ...rest };
};

/** Applies {@link inlineAllOf} to a node and every nested schema position. */
const inlineAllOfDeep = (node: any): any => {
  if (Array.isArray(node)) {
    return node.map(inlineAllOfDeep);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }
  // `anyOf` collapses run first: they merge a branch up, and that branch carries the `allOf` wrapper
  // `inlineAllOf` has to flatten.
  const inlined = collapseEchoRef(inlineAllOf(collapseNumberUnion(restoreOpenRecord(restoreEmptyObject(node)))));
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
