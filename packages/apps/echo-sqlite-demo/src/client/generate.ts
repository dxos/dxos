//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { random } from '@dxos/random';

import { foreignKey } from '../core/index.ts';
import { Organization, Person } from '../schema.ts';

/**
 * Seeds a graph with organizations and people pointing at them.
 *
 * Every object gets a foreign key, because that — not the ECHO id — is what sync matches on, so an
 * object created without one can never be correlated with another instance.
 *
 * Additive by design: a second call adds a second set rather than replacing the first.
 */
export const generate = async (
  db: SqliteDatabase,
  { organizations: organizationCount = 5, people: peopleCount = 12 }: { organizations?: number; people?: number } = {},
): Promise<number> => {
  const organizations = random.helpers.multiple(
    () =>
      db.add(
        Obj.make(Organization, {
          [Obj.Meta]: { keys: [foreignKey(random.string.uuid())] },
          name: random.company.name(),
          website: random.internet.url(),
        }),
      ),
    { count: organizationCount },
  );

  random.helpers.multiple(
    () =>
      db.add(
        Obj.make(Person, {
          [Obj.Meta]: { keys: [foreignKey(random.string.uuid())] },
          name: random.person.fullName(),
          emails: random.helpers.multiple(() => random.internet.email(), { count: { min: 1, max: 2 } }),
          employer: Ref.make(random.helpers.arrayElement(organizations)),
        }),
      ),
    { count: peopleCount },
  );

  await db.flush();
  return organizationCount + peopleCount;
};
