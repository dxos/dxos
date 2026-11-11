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

// #region append
const feed = db.add(Feed.make({ name: 'Chat' }));
await db.appendToFeed(feed, [
  Obj.make(Message, { text: 'Hello' }),
  Obj.make(Message, { text: 'Hi back' }),
]);
// #endregion append

// #region walk
const uri = Feed.getFeedUri(feed)!.toString();

// The first page, oldest first.
const page = await db
  .query(
    Query.select(Filter.type(Message))
      .from(Scope.feed(uri, { walk: {} }))
      .orderBy(Order.natural('asc'))
      .limit(50),
  )
  .run();

// The next page resumes after the last item read.
const cursor = Feed.getLocalCursor(page[page.length - 1]);
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
// #endregion walk

// #region fork
// A new branch that replies to the first message instead of the second.
const branch = await db.forkFeed(
  feed,
  Obj.make(Message, { text: 'An alternate reply' }),
  { at: page[0] },
);
// The root branch up to the fork point, then the branch.
const alternate = await db
  .query(
    Query.select(Filter.type(Message))
      .from(Scope.feed(uri, { walk: { branch } }))
      .orderBy(Order.natural('asc')),
  )
  .run();
// #endregion fork

// #region options
Obj.update(feed, (feed) => {
  feed.indexing = { enabled: false };
  feed.retention = { maxLength: 1_000 };
});
// #endregion options

export { alternate, next };
