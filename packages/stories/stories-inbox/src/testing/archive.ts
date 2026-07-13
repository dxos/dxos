//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { type Mailbox } from '@dxos/plugin-inbox';
import { Message } from '@dxos/types';

/**
 * Feed export/import for the MailboxSync story's `ArchiveModule`. The exported JSON is for local
 * development testing only and is never committed. Import replaces the mailbox's backing feed with a
 * fresh {@link Feed.Feed} seeded from the file, minting new message ids so a file can be re-imported
 * into the space it came from without id collisions.
 */

/** Serializes every message in the feed to plain JSON (the download payload). */
export const exportFeedMessages = async (feed: Feed.Feed, db: Database.Database): Promise<Obj.JSON[]> => {
  const messages = await EffectEx.runPromise(
    Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
  );
  return messages.map((message) => Obj.toJSON(message));
};

// Data fields lifted from a serialized message. Identity/system fields (`id`, `@type`, `@meta`) and
// cross-object refs (`parentMessage`, `attachments`) are dropped so each import mints fresh,
// self-contained messages rather than dangling against objects absent from the target space.
const reconstructMessage = (json: any): Message.Message =>
  Message.make({
    created: json.created,
    sender: json.sender,
    blocks: json.blocks ?? [],
    threadId: json.threadId,
    properties: json.properties,
  });

/**
 * Replaces the mailbox's backing feed with a fresh one seeded from serialized messages, then deletes
 * the previous feed. Returns the number of messages imported.
 */
export const replaceFeed = async (
  mailbox: Mailbox.Mailbox,
  serialized: unknown[],
  db: Database.Database,
): Promise<number> => {
  const messages = serialized.map(reconstructMessage);

  // Resolve the outgoing feed before reassignment so it can be deleted afterwards.
  const previous = await mailbox.feed?.tryLoad();

  // Parent the new feed to the mailbox so it persists with (and cascade-deletes alongside) it.
  const next = Feed.make();
  Obj.setParent(next, mailbox);
  Obj.update(mailbox, (mailbox) => {
    mailbox.feed = Ref.make(next);
  });
  await db.flush({ indexes: true });

  await EffectEx.runPromise(Feed.append(next, messages).pipe(Effect.provide(Database.layer(db))));

  if (previous && previous.id !== next.id) {
    db.remove(previous);
  }
  await db.flush({ indexes: true });

  return messages.length;
};

/**
 * Returns the mailbox to a clean slate: removes the sync binding(s) targeting it, deletes every saved
 * {@link Connection} (and its {@link AccessToken}), and empties the feed. Used by the story's Reset
 * control — the binding removal alone leaves Connection accounts behind, so they otherwise accumulate
 * in the Connect menu across reconnects.
 */
export const resetMailbox = async (mailbox: Mailbox.Mailbox, db: Database.Database): Promise<void> => {
  const bindings = await db.query(Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding)).run();
  bindings.filter(SyncBinding.instanceOf).forEach((binding) => db.remove(binding));

  const connections = await db.query(Filter.type(Connection.Connection)).run();
  for (const connection of connections) {
    const token = await connection.accessToken?.tryLoad();
    if (token) {
      db.remove(token);
    }
    db.remove(connection);
  }

  await replaceFeed(mailbox, [], db);
};
