//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EID } from '@dxos/keys';
import { Person } from '@dxos/types';

import { buildContactIndex } from './contact-index.ts';

/**
 * The list-level lookup: one Person query for the whole list, reduced to an email→contact map. Tested
 * against a real database rather than plain objects, because the reported failure was that seeded
 * Persons did not resolve — which would be invisible to a test using literals.
 */
describe('buildContactIndex', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('indexes every seeded Person by address', async ({ expect }) => {
    const db = await seed();
    const people = await db.query(Filter.type(Person.Person)).run();

    const index = buildContactIndex(people);
    expect(index.size).toBe(2);
    expect(index.get('ada@example.com')).toBeDefined();
  });

  test('matches case-insensitively, since providers vary address case', async ({ expect }) => {
    const db = await seed();
    const people = await db.query(Filter.type(Person.Person)).run();

    const index = buildContactIndex(people);
    expect(index.get('alan@example.com')).toBeDefined();
  });

  test('resolves to the Person object it indexed', async ({ expect }) => {
    const db = await seed();
    const people = await db.query(Filter.type(Person.Person)).run();
    const ada = people.find((person) => person.fullName === 'Ada Lovelace');
    expect(ada, 'seeded Person not found').toBeDefined();

    const index = buildContactIndex(people);
    expect(index.get('ada@example.com')).toBe(EID.tryParse(Obj.getURI(ada as Person.Person).toString()));
  });

  test('skips a Person with no addresses rather than throwing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Person.Person] });
    db.add(Person.make({ fullName: 'No Address' }));
    await db.flush({ indexes: true });
    const people = await db.query(Filter.type(Person.Person)).run();

    expect(buildContactIndex(people).size).toBe(0);
  });

  const seed = async () => {
    const { db } = await builder.createDatabase({ types: [Person.Person] });
    db.add(Person.make({ fullName: 'Ada Lovelace', emails: [{ value: 'ada@example.com' }] }));
    db.add(Person.make({ fullName: 'Alan Turing', emails: [{ value: 'Alan@Example.com' }] }));
    await db.flush({ indexes: true });
    return db;
  };
});
