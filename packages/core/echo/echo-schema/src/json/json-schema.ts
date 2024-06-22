//
// Copyright 2024 DXOS.org
//

import { JSONSchema } from '@effect/schema';
import * as AST from '@effect/schema/AST';
import { JSONSchemaAnnotationId } from '@effect/schema/AST';
import { type JsonSchema7Object, type JsonSchema7Root, type JsonSchema7Any } from '@effect/schema/JSONSchema';
import * as S from '@effect/schema/Schema';
import { type Mutable } from 'effect/Types';

import { invariant } from '@dxos/invariant';

import {
  type EchoObjectAnnotation,
  EchoObjectAnnotationId,
  type EchoObjectFieldMetaAnnotation,
  EchoObjectFieldMetaAnnotationId,
  ReferenceAnnotation,
} from '../annotations';
import { createEchoReferenceSchema } from '../ref-annotation';

const ECHO_REFINEMENT_KEY = '$echo';
interface EchoRefinement {
  type?: EchoObjectAnnotation;
  reference?: EchoObjectAnnotation;
  fieldMeta?: EchoObjectFieldMetaAnnotation;
}
const annotationToRefinementKey: { [annotation: symbol]: keyof EchoRefinement } = {
  [EchoObjectAnnotationId]: 'type',
  [ReferenceAnnotation]: 'reference',
  [EchoObjectFieldMetaAnnotationId]: 'fieldMeta',
};

export enum PropType {
  NONE = 0,
  STRING = 1, // TODO(burdon): vs TEXT?
  NUMBER = 2,
  BOOLEAN = 3,
  DATE = 4,
  REF = 5, // TODO(burdon): Add RICH text separately?
  RECORD = 6,
  ENUM = 7,
}

// TODO(burdon): Reconcile with plugin-table.
export const getPropType = (type?: PropType): string => {
  switch (type) {
    case PropType.REF:
      return 'ref';
    case PropType.BOOLEAN:
      return 'boolean';
    case PropType.NUMBER:
      return 'number';
    case PropType.DATE:
      return 'date';
    case PropType.STRING:
      return 'string';
    case PropType.RECORD:
      return 'object';
    default:
      throw new Error(`Invalid type: ${type}`);
  }
};

/**
 * @deprecated Use TS-Effect types to generate JSON Schema
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: { [key: string]: JsonSchema };
  items?: JsonSchema;
}

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const getSchemaTypename = (schema: JsonSchema): string | undefined => {
  const match = schema.$ref?.match(/#\/\$defs\/(.+)/);
  if (match) {
    return match[1];
  } else {
    return undefined;
  }
};

export const effectToJsonSchema = (schema: S.Schema<any>): any => {
  const withEchoRefinements = (ast: AST.AST): AST.AST => {
    let recursiveResult: AST.AST = ast;
    if (AST.isTypeLiteral(ast)) {
      recursiveResult = {
        ...ast,
        propertySignatures: ast.propertySignatures.map((prop) => ({
          ...prop,
          type: withEchoRefinements(prop.type),
        })),
      } as any;
    } else if (AST.isUnion(ast)) {
      recursiveResult = { ...ast, types: ast.types.map(withEchoRefinements) } as any;
    } else if (AST.isTupleType(ast)) {
      recursiveResult = {
        ...ast,
        elements: ast.elements.map((e) => ({ ...e, type: withEchoRefinements(e.type) })),
        rest: ast.rest.map((e) => withEchoRefinements(e)),
      } as any;
    }
    const refinement: EchoRefinement = {};
    for (const annotation of [EchoObjectAnnotationId, ReferenceAnnotation, EchoObjectFieldMetaAnnotationId]) {
      if (ast.annotations[annotation] != null) {
        refinement[annotationToRefinementKey[annotation]] = ast.annotations[annotation] as any;
      }
    }
    if (Object.keys(refinement).length === 0) {
      return recursiveResult;
    }
    return new AST.Refinement(recursiveResult, () => null as any, {
      [JSONSchemaAnnotationId]: { [ECHO_REFINEMENT_KEY]: refinement },
    });
  };

  const schemaWithRefinements = S.make(withEchoRefinements(schema.ast));
  return JSONSchema.make(schemaWithRefinements);
};

const jsonToEffectTypeSchema = (root: JsonSchema7Object, defs: JsonSchema7Root['$defs']): S.Schema<any> => {
  invariant('type' in root && root.type === 'object', `not an object: ${root}`);
  invariant(root.patternProperties == null, 'template literals are not supported');
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
  if (typeof root.additionalProperties !== 'object') {
    schemaWithoutEchoId = S.Struct(fields);
  } else {
    const indexValue = jsonToEffectSchema(root.additionalProperties, defs);
    if (propertyList.length > 0) {
      schemaWithoutEchoId = S.Struct(fields, { key: S.String, value: indexValue });
    } else {
      schemaWithoutEchoId = S.Record(S.String, indexValue);
    }
  }

  if (echoRefinement == null) {
    return schemaWithoutEchoId as any;
  }

  invariant(immutableIdField, 'no id in echo type');
  const schema = S.extend(S.mutable(schemaWithoutEchoId), S.Struct({ id: immutableIdField }));
  const annotations: Mutable<S.Annotations.Schema<any>> = {};
  for (const annotation of [EchoObjectAnnotationId, ReferenceAnnotation, EchoObjectFieldMetaAnnotationId]) {
    if (echoRefinement[annotationToRefinementKey[annotation]]) {
      annotations[annotation] = echoRefinement[annotationToRefinementKey[annotation]];
    }
  }

  return schema.annotations(annotations) as any;
};

const parseJsonSchemaAny = (root: JsonSchema7Any): S.Schema<any> => {
  const echoRefinement: EchoRefinement = (root as any)[ECHO_REFINEMENT_KEY];
  if (echoRefinement?.reference != null) {
    return createEchoReferenceSchema(echoRefinement.reference);
  }
  return S.Any;
};

export const jsonToEffectSchema = (root: JsonSchema7Root, definitions?: JsonSchema7Root['$defs']): S.Schema<any> => {
  const defs = root.$defs ? { ...definitions, ...root.$defs } : definitions ?? {};
  if ('type' in root && root.type === 'object') {
    return jsonToEffectTypeSchema(root, defs);
  }

  let result: S.Schema<any>;
  if ('$id' in root) {
    switch (root.$id) {
      case '/schemas/any':
        result = parseJsonSchemaAny(root);
        break;
      case '/schemas/unknown':
        result = S.Unknown;
        break;
      case '/schemas/{}':
      case '/schemas/object':
        result = S.Object;
        break;
    }
  } else if ('const' in root) {
    result = S.Literal(root.const);
  } else if ('enum' in root) {
    result = S.Union(...root.enum.map((e) => S.Literal(e)));
  } else if ('anyOf' in root) {
    result = S.Union(...root.anyOf.map((v) => jsonToEffectSchema(v, defs)));
  } else if ('$comment' in root && root.$comment === '/schemas/enums') {
    result = S.Enums(Object.fromEntries(root.oneOf.map(({ title, const: v }) => [title, v])));
  } else if ('type' in root) {
    switch (root.type) {
      case 'string':
        result = S.String;
        break;
      case 'number':
        result = S.Number;
        break;
      case 'integer':
        result = S.Number.pipe(S.int());
        break;
      case 'boolean':
        result = S.Boolean;
        break;
      case 'array':
        if (Array.isArray(root.items)) {
          result = S.Tuple(...root.items.map((v) => jsonToEffectSchema(v, defs)));
        } else {
          invariant(root.items);
          result = S.Array(jsonToEffectSchema(root.items, defs));
        }
        break;
    }
  } else if ('$ref' in root) {
    const refSegments = root.$ref.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    result = jsonToEffectSchema(jsonSchema, defs).pipe(S.identifier(refSegments[refSegments.length - 1]));
  } else {
    result = S.Unknown;
  }

  const refinement: EchoRefinement | undefined = (root as any)[ECHO_REFINEMENT_KEY];
  return refinement?.fieldMeta
    ? result.annotations({ [EchoObjectFieldMetaAnnotationId]: refinement.fieldMeta })
    : result;
};
