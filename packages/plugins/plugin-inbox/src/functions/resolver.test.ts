//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Organization, Person } from '@dxos/types';

import { InboxResolver, Resolver } from './resolver';

describe('resolver', () => {
  it.effect(
    'resolve',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Organization
        expect(yield* Resolver.resolve(Organization.Organization, { email: 'alice@dxos.org' })).toBeDefined();
        expect(yield* Resolver.resolve(Organization.Organization, { email: 'bob@dxos.org' })).toBeDefined();
        expect(yield* Resolver.resolve(Organization.Organization, { email: 'charlie@testing.com' })).not.toBeDefined();

        // Person
        expect(yield* Resolver.resolve(Person.Person, { email: 'alice@dxos.org' })).toBeDefined();
        expect(yield* Resolver.resolve(Person.Person, { email: 'alice@gmail.com' })).not.toBeDefined();
      },
      Effect.provide(
        InboxResolver.Mock({
          organizations: [
            Organization.make({ name: 'DXOS', website: 'dxos.org' }),
            Organization.make({ name: 'Example', website: 'example.com' }),
          ],
          people: [
            Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }),
            Person.make({ fullName: 'Bob', emails: [{ value: 'bob@example.com' }, { value: 'bob@dxos.org' }] }),
          ],
        }),
      ),
    ),
  );
});
