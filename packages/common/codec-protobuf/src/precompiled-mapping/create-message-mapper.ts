//
// Copyright 2022 DXOS.org
//

import pb from 'protobufjs';

import { invariant } from '@dxos/invariant';

import { type MapingDescriptors, type TypeMapperContext } from '../mapping';

export type Mapper = (obj: any, extraArgs: any[]) => any;

export const createMessageMapper = (type: pb.Type, substitutions: MapingDescriptors): Mapper =>
  createMessageMapperCached(type, substitutions, {}).map;

/**
 * Builds a substitution-aware mapper for a protobuf type.
 *
 * NOTE: A previous version of this file built the mapper via runtime
 * `Function(...)` codegen (see `./codegen.ts`). That fails on `workerd`
 * (Cloudflare Workers) with `EvalError: Code generation from strings
 * disallowed for this context`. This implementation is functionally equivalent
 * but interpreter-style: it walks `type.fieldsArray` per call and applies the
 * same substitution / recursive logic without ever calling `Function`.
 */
const createMessageMapperCached = (
  type: pb.Type,
  substitutions: MapingDescriptors,
  cache: Record<string, { map: Mapper }>,
): { map: Mapper } => {
  if (cache[type.fullName]) {
    return cache[type.fullName];
  }

  // Indirection to allow for recursive message types: register a placeholder
  // before recursing into nested fields so cycles resolve to this entry.
  const entry: { map: Mapper } = {} as any;
  cache[type.fullName] = entry;

  entry.map = (obj: any, extraArgs: any[]) => {
    const res: Record<string, any> = {};
    for (const field of type.fieldsArray) {
      field.resolve();

      const mapScalar = (value: any): any => {
        const substitution = field.resolvedType && substitutions[field.resolvedType.fullName.slice(1)];
        if (substitution) {
          const context: TypeMapperContext = {
            messageName: type.fullName.slice(1),
            fieldName: field.name,
          };
          return substitution(value, context, ...extraArgs);
        } else if (field.resolvedType && field.resolvedType instanceof pb.Type) {
          const nestedMapper = createMessageMapperCached(field.resolvedType, substitutions, cache);
          return nestedMapper.map(value, extraArgs);
        } else {
          return value;
        }
      };

      const fieldValue = obj[field.name];
      if (fieldValue !== undefined && fieldValue !== null) {
        if (field.repeated) {
          res[field.name] = (fieldValue as any[]).map((item) => mapScalar(item));
        } else if (field.map) {
          invariant(field instanceof pb.MapField);
          const out: Record<string, any> = {};
          for (const key of Object.keys(fieldValue)) {
            out[key] = mapScalar((fieldValue as Record<string, any>)[key]);
          }
          res[field.name] = out;
        } else {
          res[field.name] = mapScalar(fieldValue);
        }
      } else if (!field.getOption('proto3_optional') && !field.repeated && !field.map && !field.partOf) {
        if (field.resolvedType instanceof pb.Type) {
          const nestedMapper = createMessageMapperCached(field.resolvedType, substitutions, cache);
          res[field.name] = nestedMapper.map({}, extraArgs);
        } else if (field.resolvedType instanceof pb.Enum) {
          res[field.name] = 0;
        } else {
          res[field.name] = getDefaultValue(field.type);
        }
      }
    }
    return res;
  };

  return entry;
};

/**
 * Returns the runtime default value for a primitive protobuf field type.
 *
 * NOTE: The previous codegen version returned source strings (e.g. `'""'`,
 * `'"0"'`, `'new Uint8Array()'`) that were spliced into generated code; the
 * interpreter mapper above needs actual JS values, so the strings have been
 * unwrapped to their corresponding runtime values.
 */
const getDefaultValue = (type: string): unknown => {
  switch (type) {
    case 'double':
    case 'float':
    case 'int32':
    case 'sfixed32':
    case 'uint32':
    case 'sint32':
    case 'fixed32':
      return 0;
    case 'sint64':
    case 'int64':
    case 'uint64':
    case 'fixed64':
    case 'sfixed64':
      return '0';
    case 'bool':
      return false;
    case 'string':
      return '';
    case 'bytes':
      return new Uint8Array();
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};
