//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import * as pb from 'protobufjs';

import { MapingDescriptors } from '../mapping';
import { codegen, ref } from './codegen';

export type Mapper = (obj: any, extraArgs: any[]) => any;

export const createMessageMapper = (type: pb.Type, substitutions: MapingDescriptors): Mapper => createMessageMapperCached(type, substitutions, {}).map;

const createMessageMapperCached = (type: pb.Type, substitutions: MapingDescriptors, cache: Record<string, { map: Mapper }>) => {
  if (!cache[type.fullName]) {
    // Indirection to allow for recursive message types.
    cache[type.fullName] = {} as any;
    cache[type.fullName].map = codegen(`${type.name}$map`, ['obj', 'extraArgs'], c => {
      c`const res = {};`;
      for (const field of type.fieldsArray) {
        c`if(obj.${field.name} !== undefined && obj.${field.name} !== null) {`; {
          const genMapScalar = (value: string) => {
            field.resolve();
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

          // TODO(dmaretskyi): Support maps.
          if (field.repeated) {
            c`res.${field.name} = obj.${field.name}.map(item => `;
            genMapScalar('item');
            c`);`;
          } else if (field.map) {
            assert(field instanceof pb.MapField);
            c`res.${field.name} = {};`;
            c`for(const key of Object.keys(obj.${field.name})) {`; {
              c`res.${field.name}[key] = `;
              genMapScalar(`obj.${field.name}[key]`);
              c`;`;
            } c`}`;
          } else {
            c`res.${field.name} = `;
            genMapScalar(`obj.${field.name}`);
            c`;`;
          }
        } c`}`;
      }
      c`return res;`;
    });
  }

  return cache[type.fullName];
};
