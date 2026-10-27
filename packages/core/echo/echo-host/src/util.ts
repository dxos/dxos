//
// Copyright 2024 DXOS.org
//

import { type DatabaseDirectory, EncodedReference, EntityStructure } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

/** Worker work this long holds every query queued behind it, so it is logged above the worker's log filter. */
export const SLOW_WORK_MS = 1_000;

/**
 * Assumes properties are at root.
 */
export const findInlineObjectOfType = (
  spaceDoc: DatabaseDirectory,
  typename: string,
): [string, EntityStructure] | undefined => {
  for (const id in spaceDoc.objects ?? {}) {
    const obj = spaceDoc.objects![id];
    const objType = EntityStructure.getTypeReference(obj);
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
