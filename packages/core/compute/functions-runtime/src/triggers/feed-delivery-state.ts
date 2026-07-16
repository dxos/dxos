//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * Meta key holding the set of feed-item ids already delivered to a feed trigger, JSON-encoded as an
 * array. Co-located with `KEY_FEED_CURSOR` (see trigger-dispatcher.ts) and written in the same
 * `Obj.update` + `Database.flush()` call so cursor-advance and delivered-id-record are atomic — a
 * trigger-local `TriggerStateStore` entry (as used for subscription triggers) would be a second,
 * independently-committed write, and a crash between the two would either replay a successful
 * delivery as `isUpdate: true` or drop a genuine update back to `isUpdate: false`.
 */
export const KEY_FEED_DELIVERED_IDS = 'org.dxos.key.local-trigger-dispatcher.feed-delivered-ids';

/**
 * Reads the set of feed-item ids already delivered to this trigger. Read-only — use
 * {@link setDeliveredFeedIds} inside an `Obj.update` callback to persist additions.
 */
export const getDeliveredFeedIds = (trigger: Obj.Unknown): Set<string> => {
  const raw = Obj.getKeys(trigger, KEY_FEED_DELIVERED_IDS).at(0)?.id;
  if (!raw) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Replaces the delivered-ids meta key with `ids`. Must be called within an `Obj.update` callback.
 */
export const setDeliveredFeedIds = (trigger: Obj.Mutable<Obj.Unknown>, ids: ReadonlySet<string>): void => {
  Obj.deleteKeys(trigger, KEY_FEED_DELIVERED_IDS);
  Obj.getMeta(trigger).keys.push({
    source: KEY_FEED_DELIVERED_IDS,
    id: JSON.stringify(Array.from(ids)),
  });
};
