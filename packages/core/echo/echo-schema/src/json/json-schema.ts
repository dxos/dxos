//
// Copyright 2024 DXOS.org
//

import { type Types } from 'effect';

import { AST, JSONSchema, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import {
  type ObjectAnnotation,
  ObjectAnnotationId,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  ReferenceAnnotationId,
} from '../ast';
import { createEchoReferenceSchema } from '../handler';

/**
 * @internal
 */
const ECHO_REFINEMENT_KEY = '$echo';

export const getEchoProp = (obj: JSONSchema.JsonSchema7Object | JSONSchema.JsonSchema7): any => {
  return (obj as any)[ECHO_REFINEMENT_KEY];
};

/**
 *
 */
export const createJsonSchema = (schema: S.Struct<any> = S.Struct({})) => {
  const jsonSchema = toJsonSchema(schema);
  jsonSchema.type = 'object';
  return jsonSchema;
};

interface EchoRefinement {
  type?: ObjectAnnotation;
  reference?: ObjectAnnotation;
  annotations?: PropertyMetaAnnotation;
}

const annotationToRefinementKey: { [annotation: symbol]: keyof EchoRefinement } = {
  [ObjectAnnotationId]: 'type',
  [ReferenceAnnotationId]: 'reference',
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
 * @deprecated Use TS-Effect types to generate JSON Schema
 */
// TODO(burdon): Remove.
export type JsonSchema = {
  $schema?: string;
  $id?: string;
  $ref?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: { [key: string]: JsonSchema };
  items?: JsonSchema;
};

/**
 * Convert effect schema to JSON Schema.
 * @param schema
 */
// TODO(burdon): Return type def.
export const toJsonSchema = (schema: S.Schema.Any): JSONSchema.JsonSchema7Object => {
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

  const schemaWithRefinements = S.make(withEchoRefinements(schema.ast));
  return JSONSchema.make(schemaWithRefinements) as JSONSchema.JsonSchema7Object;
};

const jsonToEffectTypeSchema = (
  root: JSONSchema.JsonSchema7Object,
  defs: JSONSchema.JsonSchema7Root['$defs'],
): S.Schema<any> => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);
  const echoRefinement: EchoRefinement = (root as any)[ECHO_REFINEMENT_KEY];
  const fields: S.Struct.Fields = {};
  const propertyList = Object.entries(root.properties ?? {});
  let immutableIdField: S.Schema<any> | undefined;
  for (const [key, value] of propertyList) {
    if (echoRefinement?.type && key === 'id') {
      immutableIdField = jsonToEffectSchema(value, defs);
    } else {
      // TODO(burdon): Mutable cast.
      (fields as any)[key] = root.required.includes(key)
        ? jsonToEffectSchema(value, defs)
        : S.optional(jsonToEffectSchema(value, defs));
    }
  }

  let schemaWithoutEchoId: S.Schema<any, any, unknown>;
  if (root.patternProperties) {
    invariant(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
    invariant(
      Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '',
      'only one pattern property is supported',
    );

    schemaWithoutEchoId = S.Record({ key: S.String, value: jsonToEffectSchema(root.patternProperties[''], defs) });
  } else if (typeof root.additionalProperties !== 'object') {
    schemaWithoutEchoId = S.Struct(fields);
  } else {
    const indexValue = jsonToEffectSchema(root.additionalProperties, defs);
    if (propertyList.length > 0) {
      schemaWithoutEchoId = S.Struct(fields, { key: S.String, value: indexValue });
    } else {
      schemaWithoutEchoId = S.Record({ key: S.String, value: indexValue });
    }
  }

  const annotations = extractAnnotationsFromJsonSchema(root);
  if (echoRefinement == null) {
    return schemaWithoutEchoId as any;
  } else {
    invariant(immutableIdField, 'no id in echo type');

    const schema = S.extend(S.mutable(schemaWithoutEchoId), S.Struct({ id: immutableIdField }));
    return schema.annotations(annotations) as any;
  }
};

const parseJsonSchemaAny = (root: JSONSchema.JsonSchema7Any): S.Schema<any> => {
  const echoRefinement: EchoRefinement = (root as any)[ECHO_REFINEMENT_KEY];
  if (echoRefinement?.reference != null) {
    return createEchoReferenceSchema(echoRefinement.reference);
  }
  return S.Any;
};

export const jsonToEffectSchema = (
  root: JSONSchema.JsonSchema7Root,
  definitions?: JSONSchema.JsonSchema7Root['$defs'],
): S.Schema<any> => {
  const defs = root.$defs ? { ...definitions, ...root.$defs } : definitions ?? {};
  if ('type' in root && root.type === 'object') {
    return jsonToEffectTypeSchema(root, defs);
  }

  let result: S.Schema<any> = S.Unknown;
  if ('$id' in root) {
    switch (root.$id) {
      case '/schemas/any': {
        result = parseJsonSchemaAny(root);
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
    }
  } else if ('enum' in root) {
    result = S.Union(...root.enum.map((e) => S.Literal(e)));
  } else if ('anyOf' in root) {
    result = S.Union(...root.anyOf.map((v) => jsonToEffectSchema(v, defs)));
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
          result = S.Tuple(...root.items.map((v) => jsonToEffectSchema(v, defs)));
        } else {
          invariant(root.items);
          result = S.Array(jsonToEffectSchema(root.items, defs));
        }
        break;
      }
    }
  } else if ('$ref' in root) {
    const refSegments = root.$ref.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    result = jsonToEffectSchema(jsonSchema, defs).pipe(
      S.annotations({ identifier: refSegments[refSegments.length - 1] }),
    );
  }

  const refinement: EchoRefinement | undefined = (root as any)[ECHO_REFINEMENT_KEY];
  return refinement?.annotations ? result.annotations({ [PropertyMetaAnnotationId]: refinement.annotations }) : result;
};

const annotationsToJsonSchemaFields = (annotations: AST.Annotations): Record<string, any> => {
  const refinement: EchoRefinement = {};
  for (const annotation of [ObjectAnnotationId, ReferenceAnnotationId, PropertyMetaAnnotationId]) {
    if (annotations[annotation] != null) {
      refinement[annotationToRefinementKey[annotation]] = annotations[annotation] as any;
    }
  }

  if (Object.keys(refinement).length === 0) {
    return {};
  }

  return { [ECHO_REFINEMENT_KEY]: refinement };
};

const extractAnnotationsFromJsonSchema = (schema: JSONSchema.JsonSchema7): AST.Annotations => {
  const echoRefinement: EchoRefinement = (schema as any)[ECHO_REFINEMENT_KEY];

  if (echoRefinement == null) {
    return {};
  }

  const annotations: Types.Mutable<S.Annotations.Schema<any>> = {};
  for (const annotation of [ObjectAnnotationId, ReferenceAnnotationId, PropertyMetaAnnotationId]) {
    if (echoRefinement[annotationToRefinementKey[annotation]]) {
      annotations[annotation] = echoRefinement[annotationToRefinementKey[annotation]];
    }
  }

  return annotations;
};
