//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from './echo-test-builder';

describe('Obj.updateFrom (database)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reconciles a persisted expando after local drift', async () => {
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(PublicKey.random(), {
      reactiveSchemaQuery: false,
      preloadSchemaOnOpen: false,
    });

    const stored = db.add(Obj.make(TestSchema.Expando, { label: 'v1', note: 'keep' }));
    const registryCopy = Obj.clone(Obj.make(TestSchema.Expando, { label: 'v1', note: 'keep' }), { deep: true });

    Obj.change(stored, (mutable) => {
      mutable.label = 'drifted';
    });

    Obj.change(stored, (mutable) => {
      expect(Obj.updateFrom(mutable, registryCopy)).toBe(true);
    });

    expect(stored.label).toBe('v1');
    expect(stored.note).toBe('keep');
    await db.close();
  });
});
