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

import { Event, Organization, Person } from '../../echo-tutorial/schema.ts';
import { WorksAt } from './works-at.ts';

declare const db: Database.Database;

// #region common
const people = Query.type(Person);
const acme = Query.select(Filter.type(Organization, { name: 'Acme' }));
const launches = Query.select(Filter.text('launch'));
// #endregion common

// #region combine
const peopleOrOrgs = Query.all(people, Query.type(Organization));
const withoutAda = Query.without(people, Query.type(Person, { name: 'Ada' }));
// #endregion combine

// #region traverse
const employers = people.reference('employer'); // follow a Ref field
const staff = acme.referencedBy(Person, 'employer'); // follow it backwards

// relations that end at Acme, and the people at their other end
const jobs = acme.targetOf(WorksAt);
const workers = jobs.source();
// #endregion traverse

// #region order
const ordered = people
  .orderBy(Order.property<Person>('name', 'asc'), Order.updated())
  .limit(20);
// #endregion order

// #region aggregate
const [{ count }] = await db
  .query(Query.type(Event).aggregate({ count: Aggregate.count() }))
  .run();
// #endregion aggregate

// #region scope
// Types stored in the space, and types registered in code.
const types = await db
  .query(
    Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
  )
  .run();
// #endregion scope

// #region run
const all = await db.query(ordered).run();
const first = await db.query(ordered).firstOrUndefined();

const result = db.query(ordered);
const unsubscribe = result.subscribe(
  (result) => console.log(result.results.length),
  { fire: true },
);
// Each source of the answer, with its state: pending, answered or failed.
const sources = result.sources;
unsubscribe();
// #endregion run

export {
  all,
  count,
  employers,
  first,
  launches,
  peopleOrOrgs,
  sources,
  staff,
  types,
  withoutAda,
  workers,
};
