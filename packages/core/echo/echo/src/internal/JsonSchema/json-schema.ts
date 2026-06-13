//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as JSONSchema from 'effect/JSONSchema';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { raise } from '@dxos/debug';
import { SchemaEx } from '@dxos/effect';
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
import { type JsonSchemaReferenceInfo, createEchoReferenceSchema } from '../Ref';
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
  schema: Schema.Schema.All | Type.AnyEntity,
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
  let jsonSchema = _toJsonSchemaAST((schema as Schema.Schema.All).ast);
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

const _toJsonSchemaAST = (ast: SchemaAST.AST): Types.DeepMutable<JsonSchemaType> => {
  const withRefinements = withEchoRefinements(ast, '#');
  const jsonSchema = JSONSchema.fromAST(withRefinements, {
    definitions: {},
  }) as Types.DeepMutable<JsonSchemaType>;

  return normalizeJsonSchema(jsonSchema);
};

const withEchoRefinements = (
  ast: SchemaAST.AST,
  path: string | undefined,
  suspendCache = new Map<SchemaAST.AST, string>(),
): SchemaAST.AST => {
  if (path) {
    suspendCache.set(ast, path);
  }

  let recursiveResult: SchemaAST.AST;
  if (SchemaAST.isSuspend(ast)) {
    // Precompute JSON schema for suspended AST since effect serializer does not support it.
    const suspendedAst = ast.f();
    const cachedPath = suspendCache.get(suspendedAst);
    if (cachedPath) {
      recursiveResult = new SchemaAST.Suspend(() => withEchoRefinements(suspendedAst, path, suspendCache), {
        [SchemaAST.JSONSchemaAnnotationId]: {
          $ref: cachedPath,
        },
      });
    } else {
      const jsonSchema = _toJsonSchemaAST(suspendedAst);
      recursiveResult = new SchemaAST.Suspend(() => withEchoRefinements(suspendedAst, path, suspendCache), {
        [SchemaAST.JSONSchemaAnnotationId]: jsonSchema,
      });
    }
  } else if (SchemaAST.isTypeLiteral(ast)) {
    // Add property order annotations
    recursiveResult = SchemaEx.mapAst(ast, (ast, key) =>
      withEchoRefinements(ast, path && typeof key === 'string' ? `${path}/${key}` : undefined, suspendCache),
    );
    recursiveResult = addJsonSchemaFields(recursiveResult, {
      propertyOrder: [...ast.propertySignatures.map((p) => p.name)] as string[],
    });
  } else if (SchemaAST.isUndefinedKeyword(ast)) {
    // Ignore undefined keyword that appears in the optional fields.
    return ast;
  } else {
    recursiveResult = SchemaEx.mapAst(ast, (ast, key) =>
      withEchoRefinements(
        ast,
        path && (typeof key === 'string' || typeof key === 'number') ? `${path}/${key}` : undefined,
        suspendCache,
      ),
    );
  }

  const annotationFields = annotations_toJsonSchemaFields(ast.annotations);
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
export const toEffectSchema = (root: JsonSchemaType, _defs?: JsonSchemaType['$defs']): Schema.Schema.AnyNoContext => {
  const defs = root.$defs ? { ..._defs, ...root.$defs } : (_defs ?? {});
  if ('type' in root && root.type === 'object') {
    return objectToEffectSchema(root, defs);
  }

  let result: Schema.Schema.AnyNoContext = Schema.Unknown;
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
        result = anyToEffectSchema(root as JSONSchema.JsonSchema7Any);
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
    result = Schema.Union(...root.enum!.map((e) => Schema.Literal(e)));
  } else if ('oneOf' in root) {
    result = Schema.Union(...root.oneOf!.map((v) => toEffectSchema(v, defs)));
  } else if ('anyOf' in root) {
    result = Schema.Union(...root.anyOf!.map((v) => toEffectSchema(v, defs)));
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
        result = Schema.String;
        if (root.pattern) {
          result = result.pipe(Schema.pattern(new RegExp(root.pattern)));
        }
        break;
      }
      case 'number': {
        result = Schema.Number;
        break;
      }
      case 'integer': {
        result = Schema.Number.pipe(Schema.int());
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
          result = Schema.Tuple(...required, ...optional.map(Schema.optionalElement));
        } else {
          invariant(root.items);
          const items = root.items;
          result = Array.isArray(items)
            ? Schema.Tuple(...items.map((v) => toEffectSchema(v as JsonSchemaType, defs)))
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
      Schema.annotations({ identifier: refSegments[refSegments.length - 1] }),
    );
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);

  // log.info('toEffectSchema', { root, annotations });
  result = result.annotations(annotations);

  return result;
};

const objectToEffectSchema = (root: JsonSchemaType, defs: JsonSchemaType['$defs']): Schema.Schema.AnyNoContext => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);

  const echoRefinement: JsonSchemaEchoAnnotations = (root as any)[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
  const isEchoObject =
    echoRefinement != null || ('$id' in root && typeof root.$id === 'string' && root.$id.startsWith('dxn:'));

  let fields: Schema.Struct.Fields = {};
  const propertyList = Object.entries(root.properties ?? {});
  let immutableIdField: Schema.Schema.AnyNoContext | undefined;
  for (const [key, value] of propertyList) {
    if (isEchoObject && key === 'id') {
      immutableIdField = toEffectSchema(value, defs);
    } else {
      // TODO(burdon): Mutable cast.
      (fields as any)[key] = root.required?.includes(key)
        ? toEffectSchema(value, defs)
        : Schema.optional(toEffectSchema(value, defs));
    }
  }

  if (root.propertyOrder) {
    fields = orderKeys(fields, root.propertyOrder as any);
  }

  let schema: Schema.Schema<any, any, unknown>;
  if (root.patternProperties) {
    invariant(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
    invariant(
      Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '',
      'only one pattern property is supported',
    );

    schema = Schema.Record({ key: Schema.String, value: toEffectSchema(root.patternProperties[''], defs) });
  } else if (typeof root.additionalProperties !== 'object') {
    schema = Schema.Struct(fields);
  } else {
    const indexValue = toEffectSchema(root.additionalProperties, defs);
    if (propertyList.length > 0) {
      schema = Schema.Struct(fields, { key: Schema.String, value: indexValue });
    } else {
      schema = Schema.Record({ key: Schema.String, value: indexValue });
    }
  }

  if (immutableIdField) {
    schema = Schema.extend(schema, Schema.Struct({ id: immutableIdField }));
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);
  return schema.annotations(annotations) as any;
};

const anyToEffectSchema = (root: JSONSchema.JsonSchema7Any): Schema.Schema.AnyNoContext => {
  const echoRefinement: JsonSchemaEchoAnnotations = (root as any)[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
  // TODO(dmaretskyi): Is this branch still taken?
  if ((echoRefinement as any)?.reference != null) {
    const echoUri = root.$id.startsWith('echo:') ? root.$id : undefined;
    return createEchoReferenceSchema(
      echoUri,
      (echoRefinement as any).reference.typename,
      (echoRefinement as any).reference.version,
    );
  }

  return Schema.Any;
};

// TODO(dmaretskyi): Types.
const refToEffectSchema = (root: any): Schema.Schema.AnyNoContext => {
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
  const annotations: Types.Mutable<Schema.Annotations.Schema<any>> = {};

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
    annotations[SchemaAST.JSONSchemaAnnotationId] = makeTypeJsonSchemaAnnotation({
      // $id is the typename DXN — the schema's type identity. The storage EID (if any)
      // is preserved separately on TypeIdentifierAnnotation / echo.schemaId.
      identifier: DXN.make(typeAnnotation.typename, typeAnnotation.version),
      kind: typeAnnotation.kind,
      typename: typeAnnotation.typename,
      version: typeAnnotation.version,
      relationSource: typeAnnotation.sourceSchema,
      relationTarget: typeAnnotation.targetSchema,
    });
  }

  // Custom (at end).
  for (const [key, annotationId] of Object.entries({ ...CustomAnnotations, ...DecodedAnnotations })) {
    if (key in schema) {
      annotations[annotationId] = (schema as any)[key];
    }
  }

  return clearUndefined(annotations);
};

const makeAnnotatedRefinement = (ast: SchemaAST.AST, annotations: SchemaAST.Annotations): SchemaAST.Refinement => {
  return new SchemaAST.Refinement(ast, () => Option.none(), annotations);
};

const addJsonSchemaFields = (ast: SchemaAST.AST, schema: JsonSchemaType): SchemaAST.AST =>
  makeAnnotatedRefinement(ast, { [SchemaAST.JSONSchemaAnnotationId]: schema });

/**
 * Fixes field order.
 * Sets `$schema` prop.
 */
const normalizeJsonSchema = (jsonSchema: Types.DeepMutable<JsonSchemaType>): Types.DeepMutable<JsonSchemaType> => {
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
