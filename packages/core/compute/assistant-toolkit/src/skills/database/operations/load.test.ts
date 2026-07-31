//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { Load } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('Load', () => {
  it.effect(
    'load: returns one entry per requested ref',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const loaded = yield* Operation.invoke(Load, { refs: [Ref.make(organization), Ref.make(person)] });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ id: Schema.String })))(loaded);
        expect(rows.map((row) => row.id)).toEqual([organization.id, person.id]);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
