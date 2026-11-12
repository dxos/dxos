//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Order, Query } from '@dxos/echo';

import { Event, Organization, Person } from './schema.ts';

// #region by-type
export const organizations = Query.select(Filter.type(Organization)).orderBy(
  Order.property<Organization>('name', 'asc'),
);
export const people = Query.select(Filter.type(Person)).orderBy(
  Order.property<Person>('name', 'asc'),
);
export const events = Query.select(Filter.type(Event)).orderBy(
  Order.property<Event>('title', 'asc'),
);
// #endregion

// #region search
/** Every record whose text contains `text`, whatever its type. */
export const search = (text: string) =>
  Query.select(Filter.text(text, { type: 'full-text' }));
// #endregion

// #region employees
/** The people whose `employer` points at `organization`. */
export const employeesOf = (organization: Organization) =>
  Query.select(Filter.id(organization.id)).referencedBy(Person, 'employer');
// #endregion

// #region run
/** The people who work at `organization`, read once. */
export const staffOf = (db: Database.Database, organization: Organization) =>
  db.query(employeesOf(organization)).run();
// #endregion

// #region live
/**
 * Calls `onCount` with the number of people now, and again whenever it
 * changes; returns a function that stops it.
 */
export const watchCount = (
  db: Database.Database,
  onCount: (count: number) => void,
) =>
  db
    .query(people)
    .subscribe(({ results }) => onCount(results.length), { fire: true });
// #endregion
