//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Filter, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { Memory } from '../../../types/Memory';
import { SaveMemory } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('SaveMemory', () => {
  it.effect(
    'persists a memory with the given title and content',
    Effect.fnUntraced(
      function* ({ expect }) {
        const saved = yield* Operation.invoke(SaveMemory, {
          title: 'Favourite language',
          content: 'TypeScript',
        });

        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        expect(memories).toHaveLength(1);
        expect(memories[0].title).toBe('Favourite language');
        expect(memories[0].content).toBe('TypeScript');

        // The handler returns the stored entity so the agent can reference it by id.
        const { id } = yield* Schema.decodeUnknown(Schema.Struct({ id: Schema.String }))(saved);
        expect(id).toBe(memories[0].id);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
