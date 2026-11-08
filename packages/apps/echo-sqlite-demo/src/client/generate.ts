//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import { Organization, Person } from '../schema.ts';
import { foreignKey } from './sync.ts';

/** Enough names that a generated graph looks like a graph rather than a list. */
const ORGANIZATIONS = ['Cloudflare', 'DXOS', 'Ink & Switch', 'Fly.io', 'Supabase', 'Val Town'];

const FIRST = ['Alice', 'Bob', 'Carol', 'Dan', 'Erin', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Niaj'];

const LAST = ['Ahmed', 'Bauer', 'Chen', 'Diaz', 'Eriksen', 'Fontaine', 'Gupta', 'Haddad', 'Ikeda', 'Jonsson'];

const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)];

/**
 * Seeds a graph with a few organizations and people pointing at them.
 *
 * Every object gets a foreign key, because that — not the ECHO id — is what sync matches on, so an
 * object created without one can never be correlated with another instance.
 */
export const generate = async (db: SqliteDatabase, { people = 12 }: { people?: number } = {}): Promise<number> => {
  const organizations = ORGANIZATIONS.map((name) =>
    db.add(Obj.make(Organization, { [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] }, name })),
  );

  for (let index = 0; index < people; index++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    db.add(
      Obj.make(Person, {
        [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
        employer: Ref.make(pick(organizations)),
      }),
    );
  }

  await db.flush();
  return organizations.length + people;
};
