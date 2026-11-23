//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { random } from '@dxos/random';

import { Event, Organization, Person } from '../schema.ts';

/** A demo bound, and the same ceiling the Durable Object enforces, so the app can say so before a sync fails. */
export const OBJECT_LIMIT = 1_000;

/** What one generation adds, in the order the budget is spent. */
const MIX = { organizations: 5, people: 12, events: 3 };

/**
 * Seeds a graph with organizations, the people who work for them, and events those people attend.
 *
 * Every object gets a foreign key, because that — not the ECHO id — is what sync matches on, so an
 * object created without one can never be correlated with another instance.
 *
 * Additive by design: a second call adds a second set rather than replacing the first. `budget` is
 * what the graph has left before the object limit, and the mix is filled in order until it runs out.
 */
export const generate = async (
  db: SqliteDatabase,
  { budget = Number.POSITIVE_INFINITY }: { budget?: number } = {},
): Promise<number> => {
  const take = (want: number, left: number) => Math.max(0, Math.min(want, left));
  const organizationCount = take(MIX.organizations, budget);
  const peopleCount = take(MIX.people, budget - organizationCount);
  const eventCount = take(MIX.events, budget - organizationCount - peopleCount);

  const organizations = random.helpers.multiple(
    () =>
      db.add(
        Obj.make(Organization, {
          name: random.company.name(),
          website: random.internet.url(),
        }),
      ),
    { count: organizationCount },
  );

  const people = random.helpers.multiple(
    () =>
      db.add(
        Obj.make(Person, {
          name: random.person.fullName(),
          email: random.helpers.multiple(() => random.internet.email(), { count: { min: 1, max: 2 } }),
          ...(organizations.length > 0 ? { employer: Ref.make(random.helpers.arrayElement(organizations)) } : {}),
        }),
      ),
    { count: peopleCount },
  );

  random.helpers.multiple(
    () =>
      db.add(
        Obj.make(Event, {
          title: random.todo.title(),
          description: random.lorem.sentence({ min: 6, max: 12 }),
          // The second kind of edge: one event, many people.
          attendees: random.helpers.randomSubset(people, { min: 1, max: 4 }).map((person) => Ref.make(person)),
        }),
      ),
    { count: eventCount },
  );

  await db.flush();
  return organizationCount + peopleCount + eventCount;
};
