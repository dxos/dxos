//
// Copyright 2024 DXOS.org
//

import { type Types } from 'effect';

import { AST, JSONSchema, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { removeUndefinedProperties } from '@dxos/util';

import {
  getObjectAnnotation,
  type JsonSchemaType,
  type ObjectAnnotation,
  ObjectAnnotationId,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  ReferenceAnnotationId,
} from '../ast';
import { CustomAnnotations } from '../formats';
import { createEchoReferenceSchema, Expando, ref, type JsonSchemaReferenceInfo } from '../handler';

/**
 * @internal
 */
export const getEchoProp = (obj: JsonSchemaType): any => {
  return (obj as any)[ECHO_REFINEMENT_KEY];
};

/**
 * Create object jsonSchema.
 */
export const createJsonSchema = (schema: S.Struct<any> = S.Struct({})) => {
  const jsonSchema = toJsonSchema(schema);

  // TODO(dmaretskyi): Fix those in the serializer.
  jsonSchema.type = 'object';
  delete (jsonSchema as any).anyOf;
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

  // TODO(dmaretskyi): Remove.
  [ReferenceAnnotationId]: 'reference',
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
  const jsonSchema = JSONSchema.make(schemaWithRefinements) as JsonSchemaType;
  if (jsonSchema.properties && 'id' in jsonSchema.properties) {
    // Put id first.
    jsonSchema.properties = Object.assign({ id: undefined }, jsonSchema.properties);
  }

  const objectAnnotation = getObjectAnnotation(schema);
  if (objectAnnotation) {
    (jsonSchema as any).$id = `dxn:type:${objectAnnotation.typename}`;
    (jsonSchema as any).version = objectAnnotation.version;
  }

  // Fix field order.
  // TODO(dmaretskyi): Makes sure undefined is not left on optional fields for the resulting object .
  // TODO(dmaretskyi): `orderFields` util.
  // jsonSchema = Object.assign(
  //   {
  //     $schema: undefined,
  //     $id: undefined,
  //     version: undefined,
  //     type: undefined,
  //   },
  //   jsonSchema,
  // );

  return jsonSchema;
};

const withEchoRefinements = (ast: AST.AST): AST.AST => {
  let recursiveResult: AST.AST = ast;
  if (AST.isTypeLiteral(ast)) {
    recursiveResult = new AST.TypeLiteral(
      ast.propertySignatures.map(
        (prop) =>
          new AST.PropertySignature(
            prop.name,
            withEchoRefinements(prop.type),
            prop.isOptional,
            prop.isReadonly,
            prop.annotations,
          ),
      ),
      ast.indexSignatures,
    );
  } else if (AST.isUnion(ast)) {
    recursiveResult = AST.Union.make(
      ast.types.map((t) => withEchoRefinements(t)),
      ast.annotations,
    );
  } else if (AST.isTupleType(ast)) {
    recursiveResult = new AST.TupleType(
      ast.elements.map((t) => new AST.OptionalType(withEchoRefinements(t.type), t.isOptional, t.annotations)),
      ast.rest.map((t) => new AST.Type(withEchoRefinements(t.type), t.annotations)),
      ast.isReadonly,
      ast.annotations,
    );
  }

  const annotationFields = annotationsToJsonSchemaFields(ast.annotations);
  if (Object.keys(annotationFields).length === 0) {
    return recursiveResult;
  } else {
    return new AST.Refinement(recursiveResult, () => null as any, {
      [AST.JSONSchemaAnnotationId]: annotationFields,
    });
  }
};

/**
 * Convert JSON schema to effect schema.
 * @param root
 * @param definitions
 */
export const toEffectSchema = (root: JsonSchemaType, _defs?: JSONSchema.JsonSchema7Root['$defs']): S.Schema<any> => {
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

const objectToEffectSchema = (root: JsonSchemaType, defs: JSONSchema.JsonSchema7Root['$defs']): S.Schema<any> => {
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
    return ref(Expando);
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
// TODO(burdon): Pass in CustomAnnotations to keep separate.
//

/**
 * @internal
 */
export const ECHO_REFINEMENT_KEY = 'echo';

const ECHO_REFINEMENTS = [ObjectAnnotationId, PropertyMetaAnnotationId];

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

  // TODO(burdon): References.

  // Custom (at end).
  for (const [key, annotationId] of Object.entries(CustomAnnotations)) {
    const value = annotations[annotationId];
    if (value != null) {
      // TODO(burdon): Clone?
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

  // TODO(burdon): References.
  // if ('$id' in schema && typeof schema.$id === 'string' && schema.$id.startsWith('dxn:')) {
  //   annotations[ObjectAnnotationId] = {
  //     typename: DXN.parse(schema.$id).parts[0],
  //     version: (schema as any).version,
  //   };
  // }

  // Custom (at end).
  for (const [key, annotationId] of Object.entries(CustomAnnotations)) {
    if (key in schema) {
      // TODO(burdon): Clone?
      annotations[annotationId] = (schema as any)[key];
    }
  }

  return annotations;
};
