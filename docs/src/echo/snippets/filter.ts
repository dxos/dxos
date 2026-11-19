//
// Copyright 2026 DXOS.org
//

import { type Database, type Feed, Filter, Obj, Query, Tag } from '@dxos/echo';

import { Event, Person } from '../../echo-tutorial/schema.ts';

declare const db: Database.Database;
declare const launch: Event;
declare const chat: Feed.Feed;
declare const lastRead: Feed.Cursor;

// #region type
const adas = Filter.type(Person, { name: 'Ada' });
const untyped = Filter.props<{ name: string }>({ name: 'Ada' });
// #endregion

// #region identity
// The entities with these ids.
const byId = Filter.id(launch.id);

// The entities that carry a tag. The filter takes the tag's URI.
const speaker = db.add(Tag.make({ label: 'speaker' }));
const speakers = Filter.tag(Obj.getURI(speaker));

// The entities made from a registry entry, by its key and a version range.
const fromEntry = Filter.key('com.example.template.agenda', {
  version: '^1.0.0',
});
// #endregion

// #region foreign-keys
// The person synced from one record of another system.
const fromCrm = Filter.foreignKeys(Person, [
  { source: 'crm.example.com', id: 'contact-42' },
]);
// #endregion

// #region compare
// Equality: a plain value, or `eq` and `neq`.
const notAda = Filter.type(Person, { name: Filter.neq('Ada') });

// A range: names from 'A' up to, and not including, 'M'.
const firstHalf = Filter.type(Person, { name: Filter.between('A', 'M') });

// One of several values.
const atExample = Filter.type(Person, {
  email: Filter.in('ada@example.com', 'grace@example.com'),
});

// An array field that holds a value.
const urgent = Filter.props<{ labels?: readonly string[] }>({
  labels: Filter.contains('urgent'),
});
// #endregion

// #region combine
const peopleNotAda = Filter.and(Filter.type(Person), Filter.not(adas));
const results = await db.query(Query.select(peopleNotAda)).run();
// #endregion

// #region everything
const search = (text: string) =>
  // An empty search box matches no object, in place of every object.
  text.length > 0 ? Filter.text(text) : Filter.nothing();
const all = Filter.everything();
// #endregion

// #region text
const matches = Filter.text('product launch', { type: 'full-text' });
// #endregion

// #region time
const recent = Filter.updated({ after: new Date('2026-11-01') });
// #endregion

// #region parent
const owned = Filter.childOf(launch); // children, grandchildren and on
const direct = Filter.childOf(launch, { transitive: false });
// #endregion

// #region changes
const history = Query.select(Filter.changes([launch])).limit(50);
// #endregion

// #region feed-cursor
// The next 10 items after the last one this reader consumed.
const unread = Query.select(Filter.feedCursor({ begin: lastRead }))
  .from(chat)
  .limit(10);
// #endregion

export {
  all,
  atExample,
  byId,
  direct,
  firstHalf,
  fromCrm,
  fromEntry,
  history,
  matches,
  notAda,
  owned,
  recent,
  results,
  search,
  speakers,
  unread,
  untyped,
  urgent,
};
