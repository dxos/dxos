//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EID } from '@dxos/keys';
import { Person } from '@dxos/types';

/**
 * `useContactLookup` builds its email→contact map by parsing each Person's URI with
 * `EID.tryParse(Obj.getURI(person).toString())`, silently skipping anything that fails to parse. If
 * a freshly-added object's URI does not round-trip through that, the map is empty and every avatar
 * reads as unknown — which is exactly the reported symptom.
 */
describe('contact lookup URI round-trip', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a freshly added Person round-trips through EID.tryParse', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Person.Person] });
    const person = db.add(Person.make({ fullName: 'Ada Lovelace', emails: [{ value: 'ada@example.com' }] }));

    const uri = Obj.getURI(person).toString();
    expect(EID.tryParse(uri), `URI did not parse as an EID: ${uri}`).toBeDefined();
  });

  test('still round-trips after a flush', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Person.Person] });
    const person = db.add(Person.make({ fullName: 'Ada Lovelace', emails: [{ value: 'ada@example.com' }] }));
    await db.flush({ indexes: true });

    const uri = Obj.getURI(person).toString();
    expect(EID.tryParse(uri), `URI did not parse as an EID: ${uri}`).toBeDefined();
  });

  test('round-trips for a Person read back from a query, not just the added instance', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Person.Person] });
    db.add(Person.make({ fullName: 'Ada Lovelace', emails: [{ value: 'ada@example.com' }] }));
    await db.flush({ indexes: true });

    const [queried] = await db.query(Filter.type(Person.Person)).run();
    expect(queried, 'query returned no Person').toBeDefined();
    const uri = Obj.getURI(queried).toString();
    expect(EID.tryParse(uri), `URI did not parse as an EID: ${uri}`).toBeDefined();
  });
});
