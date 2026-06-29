//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Organization, Person } from '@dxos/types';

import { makeDatabaseLookup } from './lookup';

describe('makeDatabaseLookup', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('restricts candidates to the requested types', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] });
    // Both an organization and a person share the surface noun.
    db.add(Obj.make(Organization.Organization, { name: 'Mercury' }));
    db.add(Obj.make(Person.Person, { fullName: 'Mercury' }));
    await db.flush({ indexes: true });

    const lookup = makeDatabaseLookup(db);

    // Unconstrained: both types match.
    const all = await lookup('Mercury');
    expect(all.length).toBeGreaterThanOrEqual(2);

    // Constrained to organizations: only the organization matches.
    const organizations = await lookup('Mercury', { types: [Type.getTypename(Organization.Organization)!] });
    expect(organizations).toHaveLength(1);
    const match = await organizations[0].ref.load();
    expect(Obj.instanceOf(Organization.Organization, match)).toBe(true);
  });
});
