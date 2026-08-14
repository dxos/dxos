//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { meta } from '#meta';
import { Mailbox } from '#types';

/** Foreign-key tag isolating this plugin's cursors from other feed consumers (DXN-conformant). */
export const FEED_CURSOR_KEY_SOURCE = meta.profile.key;
export const CLASSIFY_CURSOR_KEY_ID = 'classifyMailbox';
export const ANALYZE_CURSOR_KEY_ID = 'analyzeMailbox';

const isConsumerCursor = (cursor: Cursor.Cursor, feedUri: string, id: string): boolean =>
  cursor.spec.kind === 'feed' &&
  cursor.spec.source.uri === feedUri &&
  Obj.getKeys(cursor, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === id);

/** Finds the persisted cursor tagged for the given consumer id on this mailbox's feed, if any. */
export const findFeedCursor = (mailbox: Mailbox.Mailbox, id: string) =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    return cursors.find((cursor) => isConsumerCursor(cursor, mailbox.feed.uri, id));
  });

/**
 * Finds-or-creates a consumer-tagged pipeline cursor. The foreign key isolates each pipeline's
 * cursor from other feed consumers on the same feed (e.g. `AnalyzeMailbox`, the CRM pipeline), so
 * two cursored pipelines never adopt each other's positions.
 *
 * `id` is required: it used to default to the process pipeline's tag, which meant a caller that forgot
 * to pass one silently shared that pipeline's cursor.
 */
export const findOrCreateFeedCursor = (mailbox: Mailbox.Mailbox, id: string) =>
  Effect.gen(function* () {
    const existing = yield* findFeedCursor(mailbox, id);
    if (existing) {
      return existing;
    }
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: mailbox.feed, target: Ref.make(mailbox) },
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
