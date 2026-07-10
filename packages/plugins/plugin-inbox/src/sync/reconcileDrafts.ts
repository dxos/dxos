//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { DraftMessage, type Mailbox } from '../types';

/**
 * Deletes drafts that have already been sent once their canonical copy syncs into the feed — matched
 * by the provider message id captured at send time (`properties.sentMessageId`, set by
 * `useEmailComposer`). Best-effort cleanup, not required for correctness: the `mailboxMessage` thread
 * connector already suppresses a matched sent draft from the rendered conversation the instant the
 * canonical message lands in the feed, so a delayed or missed reconciliation only leaves an inert,
 * locked draft object behind — never a duplicate or a gap in the UI.
 */
export const reconcileDrafts = Effect.fn('reconcileDrafts')(function* (mailbox: Mailbox.Mailbox, feed: Feed.Feed) {
  const mailboxUri = Obj.getURI(mailbox);
  const sentDrafts = (yield* Database.query(Filter.type(Message.Message, { properties: { mailbox: mailboxUri } }))
    .run).filter((candidate) => DraftMessage.belongsTo(candidate, mailboxUri) && candidate.properties?.sentMessageId);

  if (sentDrafts.length === 0) {
    return;
  }

  const syncedMessages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  const syncedIds = new Set(syncedMessages.flatMap((message) => Obj.getMeta(message).keys.map((key) => key.id)));

  const { db } = yield* Database.Service;
  for (const draft of sentDrafts) {
    if (syncedIds.has(draft.properties?.sentMessageId)) {
      db.remove(draft);
      log('reconcileDrafts: removed superseded draft', { draftId: draft.id, mailbox: mailboxUri });
    }
  }
});
