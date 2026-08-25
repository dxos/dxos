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

/**
 * What a cursor's position is ABOUT, which is not always the feed's owner.
 *
 * A mailbox scanned once has the two coincide. A pass scoped to something narrower — one Project's
 * view of a shared mailbox feed — does not: the feed belongs to the Mailbox while the watermark
 * belongs to the Project, and several such passes read the same feed at independent positions.
 */
export type CursorSubject = Obj.Any;

/** Foreign-key tag isolating this plugin's cursors from other feed consumers (DXN-conformant). */
export const FEED_CURSOR_KEY_SOURCE = meta.profile.key;
export const CLASSIFY_CURSOR_KEY_ID = 'classifyMailbox';
export const ANALYZE_CURSOR_KEY_ID = 'analyzeMailbox';

// Matches on the subject as well as the feed and the tag. Without the subject, two passes sharing a
// consumer id over one feed — the same pass run for two Projects — would adopt each other's
// watermark and silently skip each other's work, which is the failure the tags exist to prevent.
const isConsumerCursor = (cursor: Cursor.Cursor, feedUri: string, subjectUri: string, id: string): boolean =>
  cursor.spec.kind === 'feed' &&
  cursor.spec.source.uri === feedUri &&
  cursor.spec.target.uri === subjectUri &&
  Obj.getKeys(cursor, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === id);

/**
 * Finds the persisted cursor tagged for `id`, over `owner`'s feed, positioned for `subject`.
 *
 * `subject` defaults to the owner: a pass over a whole mailbox is about that mailbox.
 */
export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorSubject = owner) =>
  Effect.gen(function* () {
    const feed = getFeedRef(owner);
    if (!feed) {
      return undefined;
    }
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    // Compared against `Ref.make(subject).uri` rather than any other URI spelling, because that is
    // exactly what the write side below stores.
    const subjectUri = Ref.make(subject).uri;
    return cursors.find((cursor) => isConsumerCursor(cursor, feed.uri, subjectUri, id));
  });

/**
 * Finds-or-creates a consumer-tagged pipeline cursor. The foreign key isolates each pipeline's
 * cursor from other feed consumers on the same feed (e.g. `AnalyzeMailbox`, the CRM pipeline), so
 * two cursored pipelines never adopt each other's positions.
 *
 * `id` is required: it used to default to the process pipeline's tag, which meant a caller that forgot
 * to pass one silently shared that pipeline's cursor.
 */
export const findOrCreateFeedCursor = (owner: FeedOwner, id: string, subject: CursorSubject = owner) =>
  Effect.gen(function* () {
    const existing = yield* findFeedCursor(owner, id, subject);
    if (existing) {
      return existing;
    }
    const feed = getFeedRef(owner);
    // A caller reaching here with no feed means the owner's schema is missing `FeedAnnotation` (or
    // names a property that holds no ref) — a schema defect, not a runtime condition to recover from.
    invariant(feed, 'feed owner has no resolvable feed reference');
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: feed, target: Ref.make(subject) },
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
