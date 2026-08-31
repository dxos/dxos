//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import QueryTypesHandler from './query-types';
import { decodeTypeRow, makeTestLayer } from './testing';

const TestLayer = makeTestLayer(QueryTypesHandler);

describe('SpaceOperation.QueryTypes', () => {
  it.effect(
    'summarizes the space types, and returns a schema for the typenames named',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { types: summary } = yield* Operation.invoke(SpaceOperation.QueryTypes, {});
        const typenames = summary.map((type) => decodeTypeRow(type).typename);
        expect(typenames).toContain('com.example.type.testObject');
        // The agent addresses skills and feeds through its own surface, so they only spend context.
        expect(typenames).not.toContain('dxos.org/type/Skill');

        const { types } = yield* Operation.invoke(SpaceOperation.QueryTypes, {
          typenames: ['com.example.type.testObject'],
        });
        expect(types).toHaveLength(1);
        expect(decodeTypeRow(types[0]).jsonSchema).toBeDefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
