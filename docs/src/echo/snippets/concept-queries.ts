//
// Copyright 2026 DXOS.org
//

import {
  Aggregate,
  type Database,
  Filter,
  Order,
  Query,
  Scope,
  Type,
} from '@dxos/echo';

import { Event, Organization, Person } from '../../tutorial/schema.ts';

declare const db: Database.Database;

// #region shape
// A filter matches entities.
const adas = Filter.type(Person, { name: 'Ada' });

// A query is the shape around filters: what to select, follow and order.
const employers = Query.select(adas).reference('employer');
const staff = Query.select(Filter.type(Organization, { name: 'Acme' }))
  .referencedBy(Person, 'employer')
  .orderBy(Order.property<Person>('name', 'asc'))
  .limit(20);
// #endregion shape

// #region aggregate
const [{ people }] = await db
  .query(Query.type(Person).aggregate({ people: Aggregate.count() }))
  .run();
// #endregion aggregate

// #region scope
// Every type this space stores, and every type registered in code.
const allTypes = await db
  .query(
    Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
  )
  .run();
// #endregion scope

// #region live
const result = db.query(Query.type(Event));
const unsubscribe = result.subscribe(
  (result) => console.log(result.results.length),
  { fire: true },
);
// Each source of the answer, with its state: pending, answered or failed.
const sources = result.sources;
unsubscribe();
// #endregion live

export { allTypes, employers, people, sources, staff };
