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

import { type EchoObjectAnnotation, EchoObjectAnnotationId, ReferenceAnnotation } from './reactive';
import { Schema } from '../proto';

const ECHO_REFINEMENT_KEY = '$echo';
interface EchoRefinement {
  type?: EchoObjectAnnotation;
  reference?: EchoObjectAnnotation;
}

// TODO(burdon): Reconcile with plugin-table.
export const getPropType = (type?: Schema.PropType): string => {
  switch (type) {
    case Schema.PropType.REF:
      return 'ref';
    case Schema.PropType.BOOLEAN:
      return 'boolean';
    case Schema.PropType.NUMBER:
      return 'number';
    case Schema.PropType.DATE:
      return 'date';
    case Schema.PropType.STRING:
      return 'string';
    case Schema.PropType.RECORD:
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

/**
 * @deprecated Use TS-Effect types to generate JSON Schema
 */
export const toJsonSchema = (schema: Schema): JsonSchema => {
  return schema.props.reduce<JsonSchema>(
    (schema, { id, type, description }) => {
      invariant(id);
      // TODO(burdon): Handle nested objects.
      schema.properties![id] = stripUndefinedValues({ type: getPropType(type), description });
      return schema;
    },
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      // TODO(burdon): Invalid use of $id. Use ref which must be a valid URI.
      // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-9.2
      $id: schema.typename,
      // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-8
      $ref: schema.typename,

      title: schema.typename.split(/[.-/]/).pop(),
      type: 'object',
      properties: {},
    },
  );
};

/**
 * Convert ECHO schema to ts-effect schema.
 * @deprecated Next version will support ts-effect directly.
 */
export const toEffectSchema = (schema: Schema): S.Schema<any> => {
  // TODO(burdon): Recursive?
  const fields = schema.props.reduce<Record<string, S.Schema<any>>>((fields, { id, type, description }) => {
    let field: S.Schema<any>;
    switch (type) {
      case Schema.PropType.STRING:
        field = S.string;
        break;
      case Schema.PropType.BOOLEAN:
        field = S.boolean;
        break;
      case Schema.PropType.NUMBER:
        field = S.number;
        break;

      case Schema.PropType.REF:
      case Schema.PropType.DATE:
      case Schema.PropType.RECORD:
      default:
        log.error(`Invalid type: ${type}`);
        return fields;
    }

    if (description) {
      field = field.pipe(S.description(description));
    }

    fields[id!] = field;
    return fields;
  }, {});

  return S.struct(fields).pipe(S.identifier(schema.typename));
};

export const effectToJsonSchema = (schema: S.Schema<any>): any => {
  const withEchoRefinements = (ast: AST.AST): AST.AST => {
    if (AST.isTypeLiteral(ast)) {
      const withRefinements: any = {
        ...ast,
        propertySignatures: ast.propertySignatures.map((prop) => ({
          ...prop,
          type: withEchoRefinements(prop.type),
        })),
      };
      if (!(ast.annotations[EchoObjectAnnotationId] || ast.annotations[ReferenceAnnotation])) {
        return withRefinements;
      }
      const refinement: EchoRefinement = {
        type: ast.annotations[EchoObjectAnnotationId] as any,
        reference: ast.annotations[ReferenceAnnotation] as any,
      };
      return new AST.Refinement(withRefinements, () => null as any, {
        [JSONSchemaAnnotationId]: { [ECHO_REFINEMENT_KEY]: refinement },
      });
    } else if (AST.isUnion(ast)) {
      return { ...ast, types: ast.types.map(withEchoRefinements) } as any;
    } else if (AST.isTupleType(ast)) {
      return {
        ...ast,
        elements: ast.elements.map((e) => ({ ...e, type: withEchoRefinements(e.type) })),
        rest: ast.rest.map((e) => withEchoRefinements(e)),
      } as any;
    } else {
      return ast;
    }
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
  if (echoRefinement.type) {
    annotations[EchoObjectAnnotationId] = echoRefinement.type;
  }
  if (echoRefinement.reference) {
    annotations[ReferenceAnnotation] = echoRefinement.reference;
  }
  return schema.annotations(annotations) as any;
};

export const jsonToEffectSchema = (root: JsonSchema7Root, definitions?: JsonSchema7Root['$defs']): S.Schema<any> => {
  const defs = root.$defs ? { ...definitions, ...root.$defs } : definitions ?? {};
  if ('$id' in root) {
    switch (root.$id) {
      case '/schemas/any':
        return S.any;
      case '/schemas/unknown':
        return S.unknown;
      case '/schemas/{}':
      case '/schemas/object':
        return S.object;
    }
  }
  if ('const' in root) {
    return S.literal(root.const);
  }
  if ('enum' in root) {
    return S.union(...root.enum.map((e) => S.literal(e)));
  }
  if ('anyOf' in root) {
    return S.union(...root.anyOf.map((v) => jsonToEffectSchema(v, defs)));
  }
  if ('$comment' in root && root.$comment === '/schemas/enums') {
    return S.enums(Object.fromEntries(root.oneOf.map(({ title, const: v }) => [title, v])));
  }
  if ('type' in root) {
    switch (root.type) {
      case 'string':
        return S.string;
      case 'number':
        return S.number;
      case 'integer':
        return S.number.pipe(S.int());
      case 'boolean':
        return S.boolean;
      case 'array':
        if (Array.isArray(root.items)) {
          return S.tuple(...root.items.map((v) => jsonToEffectSchema(v, defs)));
        } else {
          invariant(root.items);
          return S.array(jsonToEffectSchema(root.items, defs));
        }
      case 'object':
        return jsonToEffectTypeSchema(root, defs);
    }
  }
  if ('$ref' in root) {
    const refSegments = root.$ref.split('/');
    const jsonSchema = defs[refSegments[refSegments.length - 1]];
    invariant(jsonSchema, `missing definition for ${root.$ref}`);
    return jsonToEffectSchema(jsonSchema, defs).pipe(S.identifier(refSegments[refSegments.length - 1]));
  }
  return S.unknown;
};
