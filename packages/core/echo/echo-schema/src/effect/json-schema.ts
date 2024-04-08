//
// Copyright 2024 DXOS.org
//

import { JSONSchema } from '@effect/schema';
import * as AST from '@effect/schema/AST';
import { JSONSchemaAnnotationId } from '@effect/schema/AST';
import { type JsonSchema7Object, type JsonSchema7Root } from '@effect/schema/JSONSchema';
import * as S from '@effect/schema/Schema';
import { type Mutable } from 'effect/Types';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { stripUndefinedValues } from '@dxos/util';

import {
  type EchoObjectAnnotation,
  EchoObjectAnnotationId,
  type EchoObjectFieldMetaAnnotation,
  EchoObjectFieldMetaAnnotationId,
  ReferenceAnnotation,
} from './reactive';

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
export const getTypename = (schema: JsonSchema): string | undefined => {
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
      fields[key] = root.required.includes(key)
        ? jsonToEffectSchema(value, defs)
        : S.optional(jsonToEffectSchema(value, defs));
    }
  }
  let schemaWithoutEchoId: S.Schema<any, any, unknown>;
  if (typeof root.additionalProperties !== 'object') {
    schemaWithoutEchoId = S.struct(fields);
  } else {
    const indexValue = jsonToEffectSchema(root.additionalProperties, defs);
    if (propertyList.length > 0) {
      schemaWithoutEchoId = S.struct(fields, { key: S.string, value: indexValue });
    } else {
      schemaWithoutEchoId = S.record(S.string, indexValue);
    }
  }
  if (echoRefinement == null) {
    return schemaWithoutEchoId as any;
  }
  invariant(immutableIdField, 'no id in echo type');
  const schema = S.extend(S.mutable(schemaWithoutEchoId), S.struct({ id: immutableIdField }));
  const annotations: Mutable<S.Annotations.Schema<any>> = {};
  for (const annotation of [EchoObjectAnnotationId, ReferenceAnnotation, EchoObjectFieldMetaAnnotationId]) {
    if (echoRefinement[annotationToRefinementKey[annotation]]) {
      annotations[annotation] = echoRefinement[annotationToRefinementKey[annotation]];
    }
  }
  return schema.annotations(annotations) as any;
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
        result = S.any;
        break;
      case '/schemas/unknown':
        result = S.unknown;
        break;
      case '/schemas/{}':
      case '/schemas/object':
        result = S.object;
        break;
    }
  } else if ('const' in root) {
    result = S.literal(root.const);
  } else if ('enum' in root) {
    result = S.union(...root.enum.map((e) => S.literal(e)));
  } else if ('anyOf' in root) {
    result = S.union(...root.anyOf.map((v) => jsonToEffectSchema(v, defs)));
  } else if ('$comment' in root && root.$comment === '/schemas/enums') {
    result = S.enums(Object.fromEntries(root.oneOf.map(({ title, const: v }) => [title, v])));
  } else if ('type' in root) {
    switch (root.type) {
      case 'string':
        result = S.string;
        break;
      case 'number':
        result = S.number;
        break;
      case 'integer':
        result = S.number.pipe(S.int());
        break;
      case 'boolean':
        result = S.boolean;
        break;
      case 'array':
        if (Array.isArray(root.items)) {
          result = S.tuple(...root.items.map((v) => jsonToEffectSchema(v, defs)));
        } else {
          invariant(root.items);
          result = S.array(jsonToEffectSchema(root.items, defs));
        }
        break;
    }
  } else if ('$ref' in root) {
    const refSegments = root.$ref.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    result = jsonToEffectSchema(jsonSchema, defs).pipe(S.identifier(refSegments[refSegments.length - 1]));
  } else {
    result = S.unknown;
  }
  const refinement: EchoRefinement | undefined = (root as any)[ECHO_REFINEMENT_KEY];
  return refinement?.fieldMeta
    ? result.annotations({ [EchoObjectFieldMetaAnnotationId]: refinement.fieldMeta })
    : result;
};
