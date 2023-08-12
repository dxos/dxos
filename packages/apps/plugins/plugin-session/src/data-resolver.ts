//
// Copyright 2023 DXOS.org
//

import { DataResolver, SessionNode } from './types';

export const dataResolvers: DataResolver[] = [];

export const resolveData = (node: SessionNode) => {
  for (const resolver of dataResolvers) {
    const result = resolver(node);
    if (result) {
      return result;
    }
  }
  return undefined;
};
