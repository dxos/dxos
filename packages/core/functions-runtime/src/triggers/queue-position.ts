//
// Copyright 2026 DXOS.org
//

import { type Entity, Obj } from '@dxos/echo';
import { FeedProtocol } from '@dxos/protocols';

/**
 * Read the queue position id stamped onto a queue object by `QueueService.append`.
 * Returns `undefined` if the object has no position key (e.g. stale data, or a write that
 * bypassed the queue service).
 */
export const getQueuePosition = (object: Entity.Unknown): string | undefined =>
  Obj.getKeys(object, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id;

/**
 * Filter queue objects to only those past the given cursor, pairing each with its position.
 * Objects without a position key are skipped defensively so that a single malformed entry
 * does not stall trigger dispatch.
 */
export const filterReadyQueueItems = <T extends Entity.Unknown>(
  objects: readonly T[],
  cursor: string | undefined,
): { item: T; position: string }[] => {
  const cursorPos = cursor !== undefined ? parseInt(cursor) : undefined;
  const ready: { item: T; position: string }[] = [];
  for (const item of objects) {
    const position = getQueuePosition(item);
    if (position === undefined) {
      continue;
    }
    if (cursorPos !== undefined && cursorPos >= parseInt(position)) {
      continue;
    }
    ready.push({ item, position });
  }
  return ready;
};
