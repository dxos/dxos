//
// Copyright 2024 DXOS.org
//

import { decodeReference, type ObjectStructure, type SpaceDoc } from '@dxos/echo-protocol';

/**
 * Assumes properties are at root.
 */
export const findInlineObjectOfType = (spaceDoc: SpaceDoc, typename: string): [string, ObjectStructure] | undefined => {
  for (const id in spaceDoc.objects ?? {}) {
    const obj = spaceDoc.objects![id];
    if (obj.system.type && decodeReference(obj.system.type).objectId === typename) {
      return [id, obj];
    }
  }

  return undefined;
};
