//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Query } from '@dxos/echo';

import { Event, Person } from '../../echo-tutorial/schema.ts';

declare const db: Database.Database;
declare const launch: Event;

// #region type
const adas = Filter.type(Person, { name: 'Ada' });
const untyped = Filter.props<{ name: string }>({ name: 'Ada' });
// #endregion

// #region compare
const atExample = Filter.type(Person, {
  email: Filter.in('ada@example.com', 'grace@example.com'),
});
// #endregion

// #region combine
const peopleNotAda = Filter.and(Filter.type(Person), Filter.not(adas));
const results = await db.query(Query.select(peopleNotAda)).run();
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

export { atExample, direct, history, matches, owned, recent, results, untyped };
