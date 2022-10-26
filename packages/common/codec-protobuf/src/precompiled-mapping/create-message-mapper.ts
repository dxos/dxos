//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import * as pb from 'protobufjs';

import { MapingDescriptors } from '../mapping';
import { codegen, ref } from './codegen';

export type Mapper = (obj: any, extraArgs: any[]) => any;

export const createMessageMapper = (type: pb.Type, substitutions: MapingDescriptors): Mapper =>
  createMessageMapperCached(type, substitutions, {}).map;

const createMessageMapperCached = (
  type: pb.Type,
  substitutions: MapingDescriptors,
  cache: Record<string, { map: Mapper }>
) => {
  if (!cache[type.fullName]) {
    // Indirection to allow for recursive message types.
    cache[type.fullName] = {} as any;
    cache[type.fullName].map = codegen(`${type.name}$map`, ['obj', 'extraArgs'], (c) => {
      c`const res = {};`;
      for (const field of type.fieldsArray) {
        field.resolve();
        c`if(obj.${field.name} !== undefined && obj.${field.name} !== null) {`;
        {
          const genMapScalar = (value: string) => {
            const substitution = field.resolvedType && substitutions[field.resolvedType.fullName.slice(1)];
            if (substitution) {
              c`${ref(substitution)}(${value}, ...extraArgs)`;
            } else if (field.resolvedType && field.resolvedType instanceof pb.Type) {
              const mapper = createMessageMapperCached(field.resolvedType, substitutions, cache);
              c`${ref(mapper)}.map(${value}, extraArgs)`;
            } else {
              c`${value}`;
            }
          };

          if (field.repeated) {
            c`res.${field.name} = obj.${field.name}.map(item => `;
            genMapScalar('item');
            c`);`;
          } else if (field.map) {
            assert(field instanceof pb.MapField);
            c`res.${field.name} = {};`;
            c`for(const key of Object.keys(obj.${field.name})) {`;
            {
              c`res.${field.name}[key] = `;
              genMapScalar(`obj.${field.name}[key]`);
              c`;`;
            }
            c`}`;
          } else {
            c`res.${field.name} = `;
            genMapScalar(`obj.${field.name}`);
            c`;`;
          }
        }
        c`}`;
        if (!field.getOption('proto3_optional') && !field.repeated && !field.map && !field.partOf) {
          c`else {`;
          {
            if (field.resolvedType instanceof pb.Type) {
              const mapper = createMessageMapperCached(field.resolvedType, substitutions, cache);
              c`res.${field.name} = ${ref(mapper)}.map({}, extraArgs);`;
            } else if (field.resolvedType instanceof pb.Enum) {
              `res.${field.name} = 0;`;
            } else {
              c`res.${field.name} = ${getDefaultValue(field.type)};`;
            }
          }
          c`}`;
        }
      }
      c`return res;`;
    });
  }

  return cache[type.fullName];
};

const getDefaultValue = (type: string): string => {
  switch (type) {
    case 'double':
    case 'float':
    case 'int32':
    case 'sfixed32':
    case 'uint32':
    case 'sint32':
    case 'fixed32':
      return '0';
    case 'sint64':
    case 'int64':
    case 'uint64':
    case 'fixed64':
    case 'sfixed64':
      return '"0"';
    case 'bool':
      return 'false';
    case 'string':
      return '""';
    case 'bytes':
      return 'new Uint8Array()';
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};
