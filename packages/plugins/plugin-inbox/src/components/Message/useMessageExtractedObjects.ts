//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, type Obj } from '@dxos/echo';

import { Mailbox } from '#types';

import { useExtractedObjects } from '../../hooks';

/**
 * Merges objects from `ExtractedFrom` relations (live space-db sources) with those recorded on
 * the owning Mailbox keyed by message id (feed-stored sources, which can't be relation endpoints),
 * deduped by id. The recorded ids reference space-db objects resolved via `getObjectById`.
 */
export const useMessageExtractedObjects = (
  db: Database.Database | undefined,
  mailbox: Mailbox.Mailbox | undefined,
  message: Mailbox.MessageLike,
): Obj.Any[] => {
  const relationObjects = useExtractedObjects(db, message);
  return useMemo(() => {
    const byId = new Map<string, Obj.Any>(relationObjects.map((object) => [object.id, object]));
    if (mailbox) {
      for (const id of Mailbox.getExtractedObjectIds(mailbox, message.id)) {
        if (!byId.has(id)) {
          const object = db?.query(Filter.id(id)).runSync()[0];
          if (object) {
            byId.set(id, object);
          }
        }
      }
    }

    return [...byId.values()];
  }, [relationObjects, mailbox, message.id, db]);
};
