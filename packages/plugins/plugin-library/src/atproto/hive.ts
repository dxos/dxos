//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type PublishEligibility } from '@dxos/schema';

/**
 * Read a Book's BookHive hive id from its catalog identifiers, if any. `hiveId` is an external catalog
 * identifier (like `goodreadsId`), stored in `catalog.identifiers` — not an ECHO sync foreign key. Its
 * presence is what gates publishing to BookHive.
 */
export const getHiveId = (object: Obj.Unknown): string | undefined => {
  const hiveId = Obj.getValue(object, ['catalog', 'identifiers', 'hiveId']);
  return typeof hiveId === 'string' && hiveId.length > 0 ? hiveId : undefined;
};

/**
 * Publish eligibility for a Book: only books linked to a BookHive catalog record (a `hiveId`) can be
 * published, since BookHive's ingester drops records whose hive id is not in its catalog. Custom books
 * have no link and are held back. The synchronous gate the publish path uses; the companion additionally
 * verifies against the live catalog via `inspectBook`.
 */
export const canPublishBook = (object: unknown): PublishEligibility =>
  // `canPublish` is typed over the policy annotation's generic `unknown`; only Books carry this closure.
  getHiveId(object as Obj.Unknown)
    ? { ok: true }
    : { ok: false, reason: 'This book is not linked to the BookHive catalog and cannot be published.' };
