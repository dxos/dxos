//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

/**
 * Per-feed processing cursor api. A derived processor (e.g. {@link InboxOperation.EnrichMailbox})
 * tracks how far it has consumed a feed by a monotonic high-water key, so re-runs skip already
 * processed messages. Keyed by feed id — associated with the Feed being consumed, not the Mailbox
 * (a mailbox is just one feed source).
 */
export type FeedCursorsApi = {
  /** The feed's high-water key (0 if never processed). */
  readonly get: (feedId: string) => number;
  /** Raises the feed's high-water key (monotonic — never lowers it). */
  readonly advance: (feedId: string, key: number) => void;
};

/**
 * Injected service holding the per-space, per-feed processing cursors. Phase 1 is in-memory and
 * shares the {@link FactStore} session lifetime, so cursor and facts reset together on reload —
 * no persisted-cursor-over-empty-store skew. Becomes durable alongside the store (worker/OPFS).
 */
export class FeedCursors extends Context.Tag('@dxos/plugin-inbox/FeedCursors')<FeedCursors, FeedCursorsApi>() {}
