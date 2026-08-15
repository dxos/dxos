//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Cursor } from '@dxos/link';
import { getFeedRef } from '@dxos/schema';

import { meta } from '#meta';
import { Mailbox } from '#types';

/**
 * Any object whose schema carries `FeedAnnotation`. The feed is resolved through the property the
 * annotation names, never by reading `.feed`, so these helpers work for a Calendar or a magazine
 * Subscription as readily as for a Mailbox.
 */
export type FeedOwner = Obj.Any;

/** Foreign-key tag isolating this plugin's cursors from other feed consumers (DXN-conformant). */
export const FEED_CURSOR_KEY_SOURCE = meta.profile.key;
export const CLASSIFY_CURSOR_KEY_ID = 'classifyMailbox';
export const ANALYZE_CURSOR_KEY_ID = 'analyzeMailbox';

const isConsumerCursor = (cursor: Cursor.Cursor, feedUri: string, id: string): boolean =>
  cursor.spec.kind === 'feed' &&
  cursor.spec.source.uri === feedUri &&
  Obj.getKeys(cursor, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === id);

/** Finds the persisted cursor tagged for the given consumer id on this owner's feed, if any. */
export const findFeedCursor = (owner: FeedOwner, id: string) =>
  Effect.gen(function* () {
    const feed = getFeedRef(owner);
    if (!feed) {
      return undefined;
    }
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    return cursors.find((cursor) => isConsumerCursor(cursor, feed.uri, id));
  });

/**
 * Finds-or-creates a consumer-tagged pipeline cursor. The foreign key isolates each pipeline's
 * cursor from other feed consumers on the same feed (e.g. `AnalyzeMailbox`, the CRM pipeline), so
 * two cursored pipelines never adopt each other's positions.
 *
 * `id` is required: it used to default to the process pipeline's tag, which meant a caller that forgot
 * to pass one silently shared that pipeline's cursor.
 */
export const findOrCreateFeedCursor = (owner: FeedOwner, id: string) =>
  Effect.gen(function* () {
    const existing = yield* findFeedCursor(owner, id);
    if (existing) {
      return existing;
    }
    const feed = getFeedRef(owner);
    // A caller reaching here with no feed means the subject's schema is missing `FeedAnnotation` (or
    // names a property that holds no ref) — a schema defect, not a runtime condition to recover from.
    invariant(feed, 'feed owner has no resolvable feed reference');
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: feed, target: Ref.make(owner) },
        [Obj.Meta]: { keys: [{ source: FEED_CURSOR_KEY_SOURCE, id }] },
      }),
    );
  });

/**
 * Finds-or-creates the analysis cursor, adopting a legacy untagged one in place.
 *
 * Analysis cursors used to be identified by carrying NO foreign key at all — "the untagged one on
 * this feed is mine". That is the absence of an identity rather than an identity, so any later
 * consumer that forgot to tag its own cursor would be silently adopted, and analysis would resume
 * from that consumer's watermark, skipping everything below it with no error.
 *
 * The adoption is what makes the fix safe to ship: creating a fresh cursor instead would re-analyze
 * every message already processed, at one LLM call each. Delete this branch once no untagged cursors
 * remain in the wild.
 */
export const findOrCreateAnalyzeCursor = (mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const tagged = yield* findFeedCursor(mailbox, ANALYZE_CURSOR_KEY_ID);
    if (tagged) {
      return tagged;
    }

    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const legacy = cursors.find(
      (cursor) =>
        cursor.spec.kind === 'feed' &&
        cursor.spec.source.uri === mailbox.feed.uri &&
        Obj.getMeta(cursor).keys.length === 0,
    );
    if (legacy) {
      Obj.update(legacy, (legacy) =>
        Obj.getMeta(legacy).keys.push({ source: FEED_CURSOR_KEY_SOURCE, id: ANALYZE_CURSOR_KEY_ID }),
      );
      return legacy;
    }

    return yield* findOrCreateFeedCursor(mailbox, ANALYZE_CURSOR_KEY_ID);
  });
