//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
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

        const rows = yield* Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ id: Schema.String })))(loaded);
        expect(rows.map((row) => row.id)).toEqual([organization.id, person.id]);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'load: expandDepth inlines the referenced object, and stops at one level',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const person = yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Miles Dyson', organization: Ref.make(organization) }),
        );
        yield* Database.flush();

        const unexpanded = yield* Operation.invoke(Load, { refs: [Ref.make(person)] });
        const [envelope] = yield* Schema.decodeUnknownEffect(
          Schema.Array(Schema.Struct({ organization: Schema.Unknown })),
        )(unexpanded);
        expect(envelope.organization).toEqual({ '/': `echo:///${organization.id}` });

        // Depth is clamped, so a larger request still expands exactly one level.
        const expanded = yield* Operation.invoke(Load, { refs: [Ref.make(person)], expandDepth: 5 });
        const [inlined] = yield* Schema.decodeUnknownEffect(
          Schema.Array(Schema.Struct({ organization: Schema.Struct({ id: Schema.String, name: Schema.String }) })),
        )(expanded);
        expect(inlined.organization).toMatchObject({ id: organization.id, name: 'Cyberdyne Systems' });
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
