//
// Copyright 2024 DXOS.org
//

import { Option, type Types } from 'effect';

import { AST, JSONSchema, S, mapAst } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { orderKeys, removeUndefinedProperties } from '@dxos/util';

import {
  getObjectAnnotation,
  FieldLookupAnnotationId,
  GeneratorAnnotationId,
  type JsonSchemaType,
  type ObjectAnnotation,
  ObjectAnnotationId,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  LabelAnnotationId,
} from '../ast';
import { createEchoReferenceSchema, Ref, type JsonSchemaReferenceInfo } from '../ast/ref';
import { CustomAnnotations } from '../formats';
import { Expando } from '../object';

/**
 * @internal
 */
export const getEchoProp = (obj: JsonSchemaType): any => {
  return (obj as any)[ECHO_REFINEMENT_KEY];
};

/**
 * Create object jsonSchema.
 */
export const createJsonSchema = (schema: S.Struct<any> = S.Struct({})): JsonSchemaType => {
  const jsonSchema = toJsonSchema(schema);

  // TODO(dmaretskyi): Fix those in the serializer.
  jsonSchema.type = 'object';
  delete jsonSchema.anyOf;
  return jsonSchema;
};

interface EchoRefinement {
  type?: ObjectAnnotation;
  reference?: ObjectAnnotation;
  annotations?: PropertyMetaAnnotation;
}

const annotationToRefinementKey: { [annotation: symbol]: keyof EchoRefinement } = {
  [ObjectAnnotationId]: 'type',
  [PropertyMetaAnnotationId]: 'annotations',
};

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

/**
 * Convert effect schema to JSON Schema.
 * @param schema
 */
export const toJsonSchema = (schema: S.Schema.All): JsonSchemaType => {
  invariant(schema);
  const schemaWithRefinements = S.make(withEchoRefinements(schema.ast));
  let jsonSchema = JSONSchema.make(schemaWithRefinements) as JsonSchemaType;
  if (jsonSchema.properties && 'id' in jsonSchema.properties) {
    // Put id first.
    jsonSchema.properties = orderKeys(jsonSchema.properties, ['id']);
  }

  const objectAnnotation = getObjectAnnotation(schema);
  if (objectAnnotation) {
    jsonSchema.$id = `dxn:type:${objectAnnotation.typename}`;
    jsonSchema.version = objectAnnotation.version;
  }

  // Fix field order.
  // TODO(dmaretskyi): Makes sure undefined is not left on optional fields for the resulting object .
  // TODO(dmaretskyi): `orderFields` util.
  jsonSchema = orderKeys(jsonSchema, [
    '$schema',
    '$id',
    'version',
    'type',
    'properties',
    'required',
    'items',
    'enum',
    'anyOf',
    'additionalProperties',
  ]);

  return jsonSchema;
};

const withEchoRefinements = (ast: AST.AST): AST.AST => {
  let recursiveResult: AST.AST;
  if (AST.isSuspend(ast)) {
    // Precompute JSON schema for suspended AST since effect serializer does not support it.
    const suspendedAst = ast.f();
    const jsonSchema = toJsonSchema(S.make(suspendedAst));
    recursiveResult = new AST.Suspend(() => withEchoRefinements(suspendedAst), {
      [AST.JSONSchemaAnnotationId]: jsonSchema,
    });
  } else {
    recursiveResult = mapAst(ast, withEchoRefinements);
  }

  const annotationFields = annotationsToJsonSchemaFields(ast.annotations);
  if (Object.keys(annotationFields).length === 0) {
    return recursiveResult;
  } else {
    return makeAnnotatedRefinement(recursiveResult, {
      [AST.JSONSchemaAnnotationId]: annotationFields,
    });
  }
};

/**
 * Convert JSON schema to effect schema.
 * @param root
 * @param definitions
 */
export const toEffectSchema = (root: JsonSchemaType, _defs?: JsonSchemaType['$defs']): S.Schema<any> => {
  const defs = root.$defs ? { ..._defs, ...root.$defs } : _defs ?? {};
  if ('type' in root && root.type === 'object') {
    return objectToEffectSchema(root, defs);
  }

  let result: S.Schema<any> = S.Unknown;
  if ('$id' in root) {
    switch (root.$id as string) {
      case '/schemas/any': {
        result = anyToEffectSchema(root as JSONSchema.JsonSchema7Any);
        break;
      }
      case '/schemas/unknown': {
        result = S.Unknown;
        break;
      }
      case '/schemas/{}':
      case '/schemas/object': {
        result = S.Object;
        break;
      }
      // Custom ECHO object reference.
      case '/schemas/echo/ref': {
        result = refToEffectSchema(root);
      }
    }
  } else if ('enum' in root) {
    result = S.Union(...root.enum!.map((e) => S.Literal(e)));
  } else if ('anyOf' in root) {
    result = S.Union(...root.anyOf!.map((v) => toEffectSchema(v, defs)));
  } else if ('type' in root) {
    switch (root.type) {
      case 'string': {
        result = S.String;
        break;
      }
      case 'number': {
        result = S.Number;
        break;
      }
      case 'integer': {
        result = S.Number.pipe(S.int());
        break;
      }
      case 'boolean': {
        result = S.Boolean;
        break;
      }
      case 'array': {
        if (Array.isArray(root.items)) {
          result = S.Tuple(...root.items.map((v) => toEffectSchema(v, defs)));
        } else {
          invariant(root.items);
          result = S.Array(toEffectSchema(root.items, defs));
        }
        break;
      }
    }
  } else if ('$ref' in root) {
    const refSegments = root.$ref!.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    result = toEffectSchema(jsonSchema, defs).pipe(S.annotations({ identifier: refSegments[refSegments.length - 1] }));
  }

  const refinement: EchoRefinement | undefined = (root as any)[ECHO_REFINEMENT_KEY];
  if (refinement?.annotations) {
    result = result.annotations({ [PropertyMetaAnnotationId]: refinement.annotations });
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);

  // log.info('toEffectSchema', { root, annotations });
  result = result.annotations(annotations);

  return result;
};

const objectToEffectSchema = (root: JsonSchemaType, defs: JsonSchemaType['$defs']): S.Schema<any> => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);

  const echoRefinement: EchoRefinement = (root as any)[ECHO_REFINEMENT_KEY];
  const isEchoObject =
    echoRefinement != null || ('$id' in root && typeof root.$id === 'string' && root.$id.startsWith('dxn:'));

  const fields: S.Struct.Fields = {};
  const propertyList = Object.entries(root.properties ?? {});
  let immutableIdField: S.Schema<any> | undefined;
  for (const [key, value] of propertyList) {
    if (isEchoObject && key === 'id') {
      immutableIdField = toEffectSchema(value, defs);
    } else {
      // TODO(burdon): Mutable cast.
      (fields as any)[key] = root.required?.includes(key)
        ? toEffectSchema(value, defs)
        : S.optional(toEffectSchema(value, defs));
    }
  }

  let schema: S.Schema<any, any, unknown>;
  if (root.patternProperties) {
    invariant(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
    invariant(
      Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '',
      'only one pattern property is supported',
    );

    schema = S.Record({ key: S.String, value: toEffectSchema(root.patternProperties[''], defs) });
  } else if (typeof root.additionalProperties !== 'object') {
    schema = S.Struct(fields);
  } else {
    const indexValue = toEffectSchema(root.additionalProperties, defs);
    if (propertyList.length > 0) {
      schema = S.Struct(fields, { key: S.String, value: indexValue });
    } else {
      schema = S.Record({ key: S.String, value: indexValue });
    }
  }

  if (immutableIdField) {
    schema = S.extend(S.mutable(schema), S.Struct({ id: immutableIdField }));
  }

  const annotations = jsonSchemaFieldsToAnnotations(root);
  return schema.annotations(annotations) as any;
};

const anyToEffectSchema = (root: JSONSchema.JsonSchema7Any): S.Schema<any> => {
  const echoRefinement: EchoRefinement = (root as any)[ECHO_REFINEMENT_KEY];
  if (echoRefinement?.reference != null) {
    return createEchoReferenceSchema(echoRefinement.reference);
  }

  return S.Any;
};

// TODO(dmaretskyi): Types.
const refToEffectSchema = (root: any): S.Schema<any> => {
  if (!('reference' in root)) {
    return Ref(Expando);
  }
  const reference: JsonSchemaReferenceInfo = root.reference;
  if (typeof reference !== 'object') {
    throw new Error('Invalid reference field in ref schema');
  }

  const targetSchemaDXN = DXN.parse(reference.schema.$ref);
  invariant(targetSchemaDXN.kind === DXN.kind.TYPE);

  return createEchoReferenceSchema(
    removeUndefinedProperties({
      typename: targetSchemaDXN.parts[0],
      version: reference.schemaVersion,
      schemaId: reference.schemaObject,
    }),
  );
};

//
// Annotations
//

/**
 * @internal
 */
export const ECHO_REFINEMENT_KEY = 'echo';

const ECHO_REFINEMENTS = [
  ObjectAnnotationId,
  PropertyMetaAnnotationId,
  LabelAnnotationId,
  FieldLookupAnnotationId,
  GeneratorAnnotationId,
];

const annotationsToJsonSchemaFields = (annotations: AST.Annotations): Record<symbol, any> => {
  const schemaFields: Record<string, any> = {};

  const echoRefinement: EchoRefinement = {};
  for (const annotation of ECHO_REFINEMENTS) {
    if (annotations[annotation] != null) {
      echoRefinement[annotationToRefinementKey[annotation]] = annotations[annotation] as any;
    }
  }
  if (Object.keys(echoRefinement).length > 0) {
    schemaFields[ECHO_REFINEMENT_KEY] = echoRefinement;
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

const jsonSchemaFieldsToAnnotations = (schema: JsonSchemaType): AST.Annotations => {
  const annotations: Types.Mutable<S.Annotations.Schema<any>> = {};

  const echoRefinement: EchoRefinement = (schema as any)[ECHO_REFINEMENT_KEY];
  if (echoRefinement != null) {
    for (const annotation of ECHO_REFINEMENTS) {
      if (echoRefinement[annotationToRefinementKey[annotation]]) {
        annotations[annotation] = echoRefinement[annotationToRefinementKey[annotation]];
      }
    }
  }

  // Custom (at end).
  for (const [key, annotationId] of Object.entries(CustomAnnotations)) {
    if (key in schema) {
      annotations[annotationId] = (schema as any)[key];
    }
  }

  return annotations;
};

const makeAnnotatedRefinement = (ast: AST.AST, annotations: AST.Annotations): AST.Refinement => {
  return new AST.Refinement(ast, () => Option.none(), annotations);
};
