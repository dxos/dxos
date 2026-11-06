//
// Copyright 2024 DXOS.org
//

import { type DatabaseDirectory, EncodedReference, EntityStructure } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

/** Worker work this long holds every query queued behind it, so it is logged above the worker's log filter. */
export const SLOW_WORK_MS = 1_000;

/**
 * Finds an object of `typename` inlined in a space directory.
 *
 * @deprecated Inline directory objects are migrated into linked documents on space open; this only finds ones that
 *   have not been migrated yet.
 */
// TODO(dmaretskyi): Remove once every space has run the inline object migration.
export const findInlineObjectOfType = (
  spaceDoc: DatabaseDirectory,
  typename: string,
): [string, EntityStructure] | undefined => {
  for (const [id, obj] of Object.entries(spaceDoc.objects ?? {})) {
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
