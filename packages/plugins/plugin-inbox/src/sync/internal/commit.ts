//
// Copyright 2026 DXOS.org
//

import { Tagging } from '@dxos/schema';

import * as SyncPipeline from '../SyncPipeline';

/**
 * Commits one page of pipeline output — the single place non-idempotent writes happen.
 *
 * Order matters for crash recovery: the feed append (a queue write) commits first, then the
 * space-db mutations (tags, contacts, cursor advance) commit together in one `flush`. The queue and
 * the space document are separate stores with no shared transaction, so a crash between the two
 * leaves the page in the feed with the cursor un-advanced — the next run re-fetches it and the
 * feed-seeded dedup set drops it. Advancing the cursor before the append would instead lose messages.
 */
export const commitPage = async (
  ctx: SyncPipeline.SyncContext,
  page: readonly SyncPipeline.CommitUnit[],
  persistCursorKey: (key: number) => void,
): Promise<number> => {
  const messages = page.map((unit) => unit.message);
  await ctx.db.appendToFeed(ctx.feed, messages);

  for (const unit of page) {
    for (const uri of unit.tagUris) {
      Tagging.set(unit.message, uri, { index: ctx.tagIndex });
    }
    for (const object of unit.extractedObjects) {
      ctx.db.add(object);
    }
  }

  const maxKey = Math.max(...page.map((unit) => unit.key));
  persistCursorKey(maxKey);

  // Flush so the space-db mutations (tags, contacts, cursor) commit and are indexed, letting the
  // next run's dedup and contact resolution observe them.
  await ctx.db.flush({ indexes: true });

  return maxKey;
};
