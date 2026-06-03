//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { DXN, EID, type URI } from '@dxos/keys';

/**
 * Reference URI for an operation. Registry operations (no owning database) are referenced by
 * their versioned key DXN so they resolve via the operation registry; space-resident operations
 * are referenced by their EID.
 */
// TODO(wittjosiah): There should be a generic & consistent way to get the dxn uri for entities if its available.
export const getOperationUri = (fn: Operation.PersistentOperation): URI.URI => {
  if (Obj.getDatabase(fn) === undefined) {
    const key = Operation.getKey(fn);
    const version = Operation.getVersion(fn);
    const dxn = key ? DXN.tryMake(version ? `dxn:${key}:${version}` : `dxn:${key}`) : undefined;
    if (dxn) {
      return dxn;
    }
  }

  return Obj.getURI(fn);
};

/**
 * Resolve an operation from a list by its reference URI (an EID for space-resident operations,
 * or a versioned key DXN for registry operations).
 */
export const findOperationByUri = (
  functions: readonly Operation.PersistentOperation[],
  uri: URI.URI,
): Operation.PersistentOperation | undefined => {
  const eid = EID.tryParse(uri);
  if (eid) {
    const entityId = EID.getEntityId(eid);
    return entityId ? functions.find((fn) => fn.id === entityId) : undefined;
  }

  if (DXN.isDXN(uri)) {
    const key = DXN.getName(uri);
    const version = DXN.getVersion(uri);
    return functions.find(
      (fn) => Operation.getKey(fn) === key && (version === undefined || Operation.getVersion(fn) === version),
    );
  }

  return undefined;
};
