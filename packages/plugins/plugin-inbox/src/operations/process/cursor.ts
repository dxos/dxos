//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { meta } from '#meta';
import { Mailbox } from '#types';

/** Foreign-key tag isolating this plugin's cursors from other feed consumers (DXN-conformant). */
export const PROCESS_CURSOR_KEY_SOURCE = meta.profile.key;
export const PROCESS_CURSOR_KEY_ID = 'processMailbox';
export const CLASSIFY_CURSOR_KEY_ID = 'classifyMailbox';

const isConsumerCursor = (cursor: Cursor.Cursor, feedUri: string, id: string): boolean =>
  cursor.spec.kind === 'feed' &&
  cursor.spec.source.uri === feedUri &&
  Obj.getKeys(cursor, PROCESS_CURSOR_KEY_SOURCE).some((key) => key.id === id);

/** Finds the persisted cursor tagged for the given consumer id on this mailbox's feed, if any. */
export const findFeedCursor = (mailbox: Mailbox.Mailbox, id: string = PROCESS_CURSOR_KEY_ID) =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    return cursors.find((cursor) => isConsumerCursor(cursor, mailbox.feed.uri, id));
  });

/** @see findFeedCursor */
export const findProcessCursor = (mailbox: Mailbox.Mailbox) => findFeedCursor(mailbox, PROCESS_CURSOR_KEY_ID);

/**
 * Finds-or-creates a consumer-tagged pipeline cursor. The foreign key isolates each pipeline's
 * cursor from other feed consumers on the same feed (e.g. `AnalyzeMailbox`, the CRM pipeline), so
 * two cursored pipelines never adopt each other's positions.
 */
export const findOrCreateFeedCursor = (mailbox: Mailbox.Mailbox, id: string = PROCESS_CURSOR_KEY_ID) =>
  Effect.gen(function* () {
    const existing = yield* findFeedCursor(mailbox, id);
    if (existing) {
      return existing;
    }
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: mailbox.feed, target: Ref.make(mailbox) },
        [Obj.Meta]: { keys: [{ source: PROCESS_CURSOR_KEY_SOURCE, id }] },
      }),
    );
  });

/** @see findOrCreateFeedCursor */
export const findOrCreateProcessCursor = (mailbox: Mailbox.Mailbox) =>
  findOrCreateFeedCursor(mailbox, PROCESS_CURSOR_KEY_ID);
