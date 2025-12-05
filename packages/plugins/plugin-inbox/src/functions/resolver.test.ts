//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { Organization, Person } from '@dxos/types';

import { createInboxResolverMap } from './resolver';

describe('resolver', () => {
  it.effect(
    'resolve contacts',
    Effect.fnUntraced(function* ({ expect }) {
      const resolvers = yield* createInboxResolverMap;

      // Organization
      expect(yield* resolvers.organization({ email: 'alice@dxos.org' })).toBeDefined();
      expect(yield* resolvers.organization({ email: 'bob@dxos.org' })).toBeDefined();
      expect(yield* resolvers.organization({ email: 'charlie@testing.com' })).not.toBeDefined();

      // Person
      expect(yield* resolvers.person({ email: 'alice@dxos.org' })).toBeDefined();
      expect(yield* resolvers.person({ email: 'alice@gmail.com' })).not.toBeDefined();
    }, Effect.provide(TestContactsLayer)),
  );
});

const TestContactsLayer = TestDatabaseLayer({
  types: [Organization.Organization, Person.Person],
  onInit: () =>
    Effect.gen(function* () {
      const objects = [
        // Organization
        Organization.make({ name: 'DXOS', website: 'dxos.org' }),
        Organization.make({ name: 'Example', website: 'example.com' }),

        // Person
        Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }),
        Person.make({ fullName: 'Bob', emails: [{ value: 'bob@example.com' }, { value: 'bob@dxos.org' }] }),
      ];

      for (const obj of objects) {
        yield* Database.Service.add(obj);
      }
    }),
});
