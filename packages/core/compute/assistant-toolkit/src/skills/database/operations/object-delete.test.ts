//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { ObjectDelete } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('ObjectDelete', () => {
  it.effect(
    'object-delete: removes the object from the database',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Doomed Corp' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectDelete, { obj: Ref.make(organization) });
        yield* Database.flush();

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(0);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
