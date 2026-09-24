//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing/index.ts';
import { Memory } from '../../../types/Memory.ts';
import { SaveMemory } from './definitions.ts';

EntityId.dangerouslyDisableRandomness();

describe('SaveMemory', () => {
  it.effect(
    'persists a memory with the given title and content',
    Effect.fnUntraced(
      function* (_) {
        const saved = yield* Operation.invoke(SaveMemory, {
          title: 'Favourite language',
          content: 'TypeScript',
        });

        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        expect(memories).toHaveLength(1);
        expect(memories[0].title).toBe('Favourite language');
        expect(memories[0].content).toBe('TypeScript');

        // The handler returns the stored entity so the agent can reference it by id.
        const { id } = yield* Schema.decodeUnknownEffect(Schema.Struct({ id: Schema.String }))(saved);
        expect(id).toBe(memories[0].id);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
