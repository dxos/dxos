//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddTypeHandler from './add-type';
import QueryTypesHandler from './query-types';
import { decodeTypeRow, makeTestLayer } from './testing';

const TestLayer = makeTestLayer(AddTypeHandler, QueryTypesHandler);

describe('SpaceOperation.AddType', () => {
  it.effect(
    'builds the type from JSON Schema, as a remote caller supplies it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.project',
          name: 'Project',
          jsonSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: 'Project',
            properties: { name: { type: 'string' }, status: { type: 'string' } },
            required: ['name'],
          },
        });

        expect(Type.getTypename(object)).toBe('com.example.type.project');
        // Registered in the space, so the object verbs can create instances of it next.
        const { types } = yield* Operation.invoke(SpaceOperation.QueryTypes, {});
        expect(types.map((type) => decodeTypeRow(type).typename)).toContain('com.example.type.project');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
