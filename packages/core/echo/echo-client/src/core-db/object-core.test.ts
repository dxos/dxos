//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';

import { EchoTestBuilder } from '../testing/index.ts';

describe('ObjectCore', () => {
  test('getUpdatedAt tracks the latest automerge change time', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    const peer = await builder.createPeer({ types: [TestSchema.Person] });
    const db = await peer.createDatabase();

    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    db.add(person);
    await db.flush();

    const firstUpdatedAt = Obj.getMeta(person).updatedAt;
    invariant(typeof firstUpdatedAt === 'number', 'expected updatedAt to be set');
    expect(Math.abs(Date.now() - firstUpdatedAt)).toBeLessThan(5_000);

    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    await db.flush();

    const secondUpdatedAt = Obj.getMeta(person).updatedAt;
    expect(secondUpdatedAt).toBeGreaterThanOrEqual(firstUpdatedAt);

    await builder.close();
  });
});
