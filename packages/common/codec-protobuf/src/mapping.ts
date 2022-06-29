//
// Copyright 2020 DXOS.org
//

import { Substitutions } from './common';

export type MapingDescriptors = Partial<Record<string, (value: any, ...extraArgs: any) => any>>

export interface BidirectionalMapingDescriptors {
  encode: MapingDescriptors,
  decode: MapingDescriptors,
}

export const createMappingDescriptors = (substitutions: Substitutions): BidirectionalMapingDescriptors => {
  const encode: MapingDescriptors = {};
  const decode: MapingDescriptors = {};
  for (const type of Object.keys(substitutions)) {
    encode[type] = substitutions[type].encode;
    decode[type] = substitutions[type].decode;
  }
  return {
    encode,
    decode
  };
};
