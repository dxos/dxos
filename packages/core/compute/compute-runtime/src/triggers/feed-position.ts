//
// Copyright 2026 DXOS.org
//

import { type Entity, Feed } from '@dxos/echo';

const parsePosition = (cursor: Feed.Cursor): number | undefined => {
  if (!/^\d+$/.test(cursor)) {
    return undefined;
  }
  const parsed = Number(cursor);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

/**
 * Filter feed items to only those past the given cursor, pairing each with its own cursor and
 * ordering them by it — the dispatcher advances its cursor to the last item it invoked, so an
 * unordered page would skip everything positioned before that item.
 *
 * Items with no cursor are skipped defensively so that a single malformed entry does not stall
 * trigger dispatch. A malformed cursor rejects all items so a corrupted checkpoint cannot cause
 * unbounded re-dispatch.
 */
export const filterReadyFeedItems = <T extends Entity.Unknown>(
  objects: readonly T[],
  cursor: Feed.Cursor | undefined,
): { item: T; cursor: Feed.Cursor }[] => {
  const cursorPos = cursor !== undefined && cursor !== Feed.START ? parsePosition(cursor) : undefined;
  if (cursor !== undefined && cursor !== Feed.START && cursorPos === undefined) {
    return [];
  }

  const ready: { item: T; cursor: Feed.Cursor; position: number }[] = [];
  for (const item of objects) {
    const itemCursor = Feed.getCursor(item);
    if (itemCursor === undefined) {
      continue;
    }
    const position = parsePosition(itemCursor);
    if (position === undefined) {
      continue;
    }
    if (cursorPos !== undefined && cursorPos >= position) {
      continue;
    }
    ready.push({ item, cursor: itemCursor, position });
  }

  return ready.sort((a, b) => a.position - b.position).map(({ item, cursor }) => ({ item, cursor }));
};
