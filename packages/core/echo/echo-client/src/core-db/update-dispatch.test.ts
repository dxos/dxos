//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { compareTypenameStrings } from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';

import { type DatabaseImpl } from '../proxy-db/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';
import { type ItemsUpdatedEvent } from './types.ts';
import { filterTypenameKey, objectTypenameKeys } from './update-dispatch.ts';

describe('UpdateDispatch', () => {
  let builder: EchoTestBuilder;
  let db: DatabaseImpl;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const record = () => {
    const events: string[][] = [];
    const listener = (event?: ItemsUpdatedEvent) => {
      events.push(event?.itemsUpdated.map(({ id }) => id) ?? []);
    };
    return { listener, events };
  };

  test('delivers a write only to keys it matches, holding only the matched objects', ({ expect }) => {
    const dispatch = db._entityManager.updateDispatch;
    const people = record();
    const tasks = record();
    const all = record();
    dispatch.set(people.listener, { typenames: [Type.getURI(TestSchema.Person)] });
    dispatch.set(tasks.listener, { typenames: [Type.getURI(TestSchema.Task)] });
    dispatch.set(all.listener);

    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    expect(people.events.flat()).toContain(alice.id);
    expect(people.events.every((ids) => ids.every((id) => id === alice.id))).toBe(true);
    expect(tasks.events).toEqual([]);
    expect(all.events.flat()).toContain(alice.id);

    for (const { listener } of [people, tasks, all]) {
      dispatch.delete(listener);
    }
  });

  test('a listener that re-keys itself during delivery receives the event once', ({ expect }) => {
    const dispatch = db._entityManager.updateDispatch;
    let deliveries = 0;
    const listener = () => {
      deliveries++;
      dispatch.set(listener);
    };
    dispatch.set(listener);

    db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const once = deliveries;
    expect(once).toBeGreaterThan(0);
    db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    expect(deliveries).toBe(once * 2);

    dispatch.delete(listener);
  });

  test('an object type carries the key of every filter typename that matches it', ({ expect }) => {
    const space = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';
    const entity = '01J00J9B45YHYSGZQTQMSKMGJ6';
    const typenames = [
      'dxn:org.dxos.type.person',
      'dxn:org.dxos.type.person:0.1.0',
      'dxn:org.dxos.type.person:0.2.0',
      'dxn:org.dxos.type.task',
      `echo://${space}/${entity}`,
      `echo:///${entity}`,
      `echo:/${entity}`,
      `echo://${space}`,
      'echo:///01J00J9B45YHYSGZQTQMSKMGJ7',
      'org.dxos.type.person',
    ];
    for (const filter of typenames) {
      for (const object of typenames) {
        if (compareTypenameStrings(filter, object)) {
          expect(objectTypenameKeys(object), `${filter} matches ${object}`).toContain(filterTypenameKey(filter));
        }
      }
    }
  });
});
