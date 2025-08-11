//
// Copyright 2024 DXOS.org
//

import { type DatabaseDirectory, ObjectStructure, decodeReference } from '@dxos/echo-protocol';

/**
 * Assumes properties are at root.
 */
export const findInlineObjectOfType = (
  spaceDoc: DatabaseDirectory,
  typename: string,
): [string, ObjectStructure] | undefined => {
  for (const id in spaceDoc.objects ?? {}) {
    const obj = spaceDoc.objects![id];
    const objType = ObjectStructure.getTypeReference(obj);
    if (objType && decodeReference(objType).objectId === typename) {
      return [id, obj];
    }
  }

  return undefined;
};
