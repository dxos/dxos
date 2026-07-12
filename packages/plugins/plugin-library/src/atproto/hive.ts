//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * Read a Book's BookHive hive id from its catalog identifiers, if any. `hiveId` is an external catalog
 * identifier (like `goodreadsId`), stored in `catalog.identifiers` — not an ECHO sync foreign key. Its
 * presence is what gates publishing to BookHive.
 */
export const getHiveId = (object: Obj.Unknown): string | undefined => {
  const hiveId = Obj.getValue(object, ['catalog', 'identifiers', 'hiveId']);
  return typeof hiveId === 'string' && hiveId.length > 0 ? hiveId : undefined;
};
