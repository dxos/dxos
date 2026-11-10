//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, DXN, Feed, Filter, Obj, Type } from '@dxos/echo';

class Message extends Type.makeObject<Message>(DXN.make('com.example.type.message', '0.1.0'))({
  text: Schema.String,
}) {}

declare const db: Database.Database;

// #region make
const feed = db.add(Feed.make({ name: 'Chat' }));

const post = Effect.gen(function* () {
  yield* Feed.append(feed, [Obj.make(Message, { text: 'Hello' }), Obj.make(Message, { text: 'Hi back' })]);
});
// #endregion make

// #region read
const read = Effect.gen(function* () {
  // Every message, oldest first.
  const messages = yield* Feed.walk(feed, Filter.type(Message)).run;

  // The next page: resume after the last item read.
  const cursor = Feed.getLocalCursor(messages[messages.length - 1]);
  const next = yield* Feed.walk(feed, Filter.type(Message), { begin: cursor, limit: 50 }).run;

  // Any filter works, as in a database query.
  const greetings = yield* Feed.query(feed, Filter.type(Message, { text: 'Hello' })).run;
  return { messages, next, greetings };
});
// #endregion read

// #region options
const configure = Effect.gen(function* () {
  yield* Feed.setIndexing(feed, { enabled: false });
  yield* Feed.setRetention(feed, { maxLength: 1_000, maxAge: '30 days' });
});
// #endregion options

// #region fork
const branch = Effect.gen(function* () {
  const [first] = yield* Feed.walk(feed, Filter.type(Message)).run;
  const id = yield* Feed.fork(feed, [Obj.make(Message, { text: 'An alternate reply' })], { at: first });
  return yield* Feed.walk(feed, Filter.type(Message), { branch: id }).run;
});
// #endregion fork

const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Database.layer(db))));

export { branch, configure, post, read, run };
