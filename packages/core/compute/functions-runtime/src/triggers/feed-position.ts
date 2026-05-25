//
// Copyright 2026 DXOS.org
//

import { Entity } from '@dxos/echo';
import { FeedProtocol } from '@dxos/protocols';

/**
 * Read the position id stamped onto a feed item by the storage layer.
 * Returns `undefined` if the object has no position key (e.g. stale data, or a write that
 * bypassed the feed service).
 */
export const getFeedPosition = (object: Entity.Unknown): string | undefined =>
  Entity.getKeys(object, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id;

const parseFeedPosition = (position: string): number | undefined => {
  if (!/^\d+$/.test(position)) {
    return undefined;
  }
  const parsed = Number(position);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

/**
 * Filter feed items to only those past the given cursor, pairing each with its position.
 * Objects without a position key are skipped defensively so that a single malformed entry
 * does not stall trigger dispatch. A malformed cursor rejects all items so a corrupted
 * checkpoint cannot cause unbounded re-dispatch.
 */
export const filterReadyFeedItems = <T extends Entity.Unknown>(
  objects: readonly T[],
  cursor: string | undefined,
): { item: T; position: string }[] => {
  const cursorPos = cursor !== undefined ? parseFeedPosition(cursor) : undefined;
  if (cursor !== undefined && cursorPos === undefined) {
    return [];
  }
  const ready: { item: T; position: string }[] = [];
  for (const item of objects) {
    const position = getFeedPosition(item);
    if (position === undefined) {
      continue;
    }
    const itemPos = parseFeedPosition(position);
    if (itemPos === undefined) {
      continue;
    }
    if (cursorPos !== undefined && cursorPos >= itemPos) {
      continue;
    }
    ready.push({ item, position });
  }
  return ready;
};
