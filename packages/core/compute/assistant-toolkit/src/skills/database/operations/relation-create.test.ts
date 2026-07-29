//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { RelationCreate } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('RelationCreate', () => {
  it.effect(
    'relation-create: links source to target and stores the properties',
    Effect.fnUntraced(
      function* (_) {
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(RelationCreate, {
          typename: Type.getTypename(Employer.Employer),
          source: Ref.make(person),
          target: Ref.make(organization),
          properties: { role: 'Engineer' },
        });

        const relations = yield* Database.query(Query.type(Employer.Employer)).run;
        expect(relations).toHaveLength(1);
        expect(relations[0].role).toBe('Engineer');
        // Endpoints, not just the properties: a swapped source/target would otherwise pass.
        expect(Relation.getSource(relations[0]).id).toBe(person.id);
        expect(Relation.getTarget(relations[0]).id).toBe(organization.id);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
