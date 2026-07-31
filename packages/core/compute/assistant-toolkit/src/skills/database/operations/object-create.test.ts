//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Query, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { ObjectCreate } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('ObjectCreate', () => {
  it.effect(
    'object-create: creates an object with the declared properties',
    Effect.fnUntraced(
      function* (_) {
        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Organization.Organization),
          properties: { name: 'Cyberdyne Systems' },
        });

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(1);
        expect(organizations[0].name).toBe('Cyberdyne Systems');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: resolves an encoded reference into a live ref',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Person.Person),
          properties: {
            fullName: 'John Doe',
            // The model emits references in this wire form; the handler decodes it to a ref.
            organization: EncodedReference.fromURI(Obj.getURI(organization)),
          },
        });

        const people = yield* Database.query(Query.type(Person.Person)).run;
        expect(people).toHaveLength(1);
        expect(people[0].organization?.target).toBe(organization);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
