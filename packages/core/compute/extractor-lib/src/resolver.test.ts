//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { resolve } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { Live, Mock } from './resolver';

describe('resolver', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('Mock resolves Person by email and Organization by domain', async ({ expect }) => {
    const layer = Mock({
      organizations: [
        Organization.make({ name: 'DXOS', website: 'dxos.org' }),
        Organization.make({ name: 'Example', website: 'example.com' }),
      ],
      people: [
        Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }),
        Person.make({ fullName: 'Bob', emails: [{ value: 'bob@example.com' }, { value: 'bob@dxos.org' }] }),
      ],
    });

    await EffectEx.runPromise(
      Effect.gen(function* () {
        // Organization.
        expect(yield* resolve(Organization.Organization, { email: 'alice@dxos.org' })).toBeDefined();
        expect(yield* resolve(Organization.Organization, { email: 'bob@dxos.org' })).toBeDefined();
        expect(yield* resolve(Organization.Organization, { email: 'charlie@testing.com' })).not.toBeDefined();

        // Person.
        expect(yield* resolve(Person.Person, { email: 'alice@dxos.org' })).toBeDefined();
        expect(yield* resolve(Person.Person, { email: 'alice@gmail.com' })).not.toBeDefined();
      }).pipe(Effect.provide(layer)),
    );
  });

  test('Live resolves Person by email and Organization by domain from the space', async ({ expect }) => {
    db.add(Obj.make(Organization.Organization, { name: 'DXOS', website: 'dxos.org' }));
    db.add(Obj.make(Person.Person, { fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }));
    await db.flush({ indexes: true });

    await EffectEx.runPromise(
      Effect.gen(function* () {
        expect(yield* resolve(Organization.Organization, { email: 'someone@dxos.org' })).toBeDefined();
        expect(yield* resolve(Organization.Organization, { email: 'someone@other.com' })).not.toBeDefined();
        expect(yield* resolve(Person.Person, { email: 'alice@dxos.org' })).toBeDefined();
        expect(yield* resolve(Person.Person, { email: 'bob@dxos.org' })).not.toBeDefined();
      }).pipe(Effect.provide(Live), Effect.provide(Database.layer(db))),
    );
  });
});
