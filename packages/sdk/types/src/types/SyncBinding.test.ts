//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import * as Cursor from './Cursor';
import * as SyncBinding from './SyncBinding';

describe('SyncBinding.layer', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('accepts a bare CursorHolder binding without a Connection source', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor] });
    const cursor = db.add(Cursor.make({ value: 'seed' }));
    // A `DerivedBinding`-shaped relation would look like this: only a cursor, no `Connection` source.
    const binding: SyncBinding.CursorHolder = { cursor: Ref.make(cursor) };

    const state = await Effect.gen(function* () {
      return yield* SyncBinding.Service;
    }).pipe(
      Effect.provide(
        SyncBinding.layer({
          binding,
          foreignKeySource: 'test',
          cursorKey: 0,
          stats: { newMessages: 0 },
        }),
      ),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.cursor.id).toBe(cursor.id);
    expect(state.cursor.value).toBe('seed');
  });
});
