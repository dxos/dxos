//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { meta } from '#meta';

import type * as Mailbox from '../../types/Mailbox';

/** Foreign-key tag isolating this pipeline's cursor from other feed consumers (DXN-conformant). */
export const PROCESS_CURSOR_KEY_SOURCE = meta.profile.key;
export const PROCESS_CURSOR_KEY_ID = 'processMailbox';

const isProcessCursor = (cursor: Cursor.Cursor, feedUri: string): boolean =>
  cursor.spec.kind === 'feed' &&
  cursor.spec.source.uri === feedUri &&
  Obj.getKeys(cursor, PROCESS_CURSOR_KEY_SOURCE).some((key) => key.id === PROCESS_CURSOR_KEY_ID);

/** Finds the persisted process-pipeline cursor for this mailbox's feed, or undefined before the first run. */
export const findProcessCursor = (mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    return cursors.find((cursor) => isProcessCursor(cursor, mailbox.feed.uri));
  });

/**
 * Finds-or-creates the process-pipeline cursor. Tagged with a foreign key so it never collides with
 * other feed consumers' cursors on the same feed (e.g. `AnalyzeMailbox`, the CRM pipeline).
 */
export const findOrCreateProcessCursor = (mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const existing = yield* findProcessCursor(mailbox);
    if (existing) {
      return existing;
    }
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: mailbox.feed, target: Ref.make(mailbox) },
        [Obj.Meta]: { keys: [{ source: PROCESS_CURSOR_KEY_SOURCE, id: PROCESS_CURSOR_KEY_ID }] },
      }),
    );
  });
