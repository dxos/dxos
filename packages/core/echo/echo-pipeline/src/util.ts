//
// Copyright 2024 DXOS.org
//

import { type DatabaseDirectory, EncodedReference, ObjectStructure } from '@dxos/echo-protocol';

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
      const typeDXN = EncodedReference.toDXN(objType);
      const typeDXNInfo = typeDXN.asTypeDXN();
      if (typeDXNInfo?.type === typename) {
        return [id, obj];
      }
    }
  }

  return undefined;
};
