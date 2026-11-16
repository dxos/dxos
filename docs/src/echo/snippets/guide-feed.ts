//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type Database,
  DXN,
  Feed,
  Filter,
  Obj,
  Order,
  Query,
  Scope,
  Type,
} from '@dxos/echo';

class Message extends Type.makeObject<Message>(
  DXN.make('com.example.type.message', '0.1.0'),
)({ text: Schema.String }) {}

declare const db: Database.Database;

// #region make
const feed = db.add(Feed.make({ name: 'Chat' }));
await db.appendToFeed(feed, [
  Obj.make(Message, { text: 'Hello' }),
  Obj.make(Message, { text: 'Hi back' }),
]);
// #endregion make

// #region read
const uri = Feed.getFeedUri(feed)!.toString();

// Every message on the main path, oldest first.
const messages = await db
  .query(
    Query.select(Filter.type(Message))
      .from(Scope.feed(uri, { walk: {} }))
      .orderBy(Order.natural('asc')),
  )
  .run();

// The next page: resume after the last item read.
const cursor = Feed.getLocalCursor(messages[messages.length - 1]);
const next = await db
  .query(
    Query.select(
      Filter.and(
        Filter.type(Message),
        Filter.feedCursor({ begin: cursor, positions: 'local' }),
      ),
    )
      .from(Scope.feed(uri, { walk: {} }))
      .orderBy(Order.natural('asc'))
      .limit(50),
  )
  .run();

// Any filter works, as in a database query.
const greetings = await db
  .query(Query.select(Filter.type(Message, { text: 'Hello' })).from(feed))
  .run();
// #endregion read

// #region options
Obj.update(feed, (feed) => {
  feed.indexing = { enabled: false };
  feed.retention = { maxLength: 1_000, maxAge: 30 * 24 * 60 * 60 * 1000 };
});
// #endregion options

// #region fork
const branch = await db.forkFeed(
  feed,
  Obj.make(Message, { text: 'An alternate reply' }),
  { at: messages[0] },
);
const alternate = await db
  .query(
    Query.select(Filter.type(Message))
      .from(Scope.feed(uri, { walk: { branch } }))
      .orderBy(Order.natural('asc')),
  )
  .run();
// #endregion fork

// #region remove
await db.deleteFromFeed(feed, [messages[1]]);
// #endregion remove

export { alternate, greetings, next };
