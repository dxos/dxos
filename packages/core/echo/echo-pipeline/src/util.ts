//
// Copyright 2024 DXOS.org
//

import { type DatabaseDirectory, EncodedReference, ObjectStructure } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

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
    if (objType) {
      const uri = EncodedReference.toURI(objType);
      // Parse the DXN to extract the typename.
      const parsed = DXN.tryMake(uri);
      if (parsed !== undefined && DXN.getName(parsed) === typename) {
        return [id, obj];
      }
    }
  }

  return undefined;
};
