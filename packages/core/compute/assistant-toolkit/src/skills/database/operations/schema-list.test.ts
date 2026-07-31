//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Feed, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { SchemaList } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('SchemaList', () => {
  it.effect(
    'schema-list: lists registered types and omits the excluded ones',
    Effect.fnUntraced(
      function* (_) {
        const schemas = yield* Operation.invoke(SchemaList, {});

        const rows = yield* Schema.decodeUnknown(
          Schema.Array(Schema.Struct({ typename: Schema.String, kind: Schema.String })),
        )(schemas);
        const typenames = rows.map((row) => row.typename);
        expect(typenames).toContain(Type.getTypename(Organization.Organization));
        expect(typenames).toContain(Type.getTypename(Person.Person));
        // Skill and Feed are on the handler's exclusion list, which keeps them out of the agent's context.
        expect(typenames).not.toContain(Type.getTypename(Skill.Skill));
        expect(typenames).not.toContain(Type.getTypename(Feed.Feed));
        expect(rows.find((row) => row.typename === Type.getTypename(Employer.Employer))?.kind).toBe('relation');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
