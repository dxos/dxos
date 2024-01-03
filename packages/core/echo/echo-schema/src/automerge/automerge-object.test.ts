//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { afterTest, describe, test } from '@dxos/test';

import { AutomergeObject } from './automerge-object';
import { Expando, TypedObject, base, setGlobalAutomergePreference } from '../object';
import { TestBuilder } from '../testing';
import { Contact, Task } from '../tests/proto';

describe('AutomergeObject', () => {
  test('objects become automerge objects when global flag is set', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Expando({});
    expect(obj[base] instanceof AutomergeObject).to.eq(true);
    expect(obj instanceof AutomergeObject).to.eq(true);
  });

  test('are instance of TypedObject', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Task({});
    expect(obj instanceof TypedObject).to.eq(true);
    expect(obj instanceof AutomergeObject).to.eq(true);
    expect(obj instanceof Task).to.eq(true);
    expect(obj instanceof Contact).to.eq(false);
  });

  test('cross reference', async () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const testBuilder = new TestBuilder();
    const { db } = await testBuilder.createPeer();

    const contact = new Contact({ name: 'Contact' }, { useAutomergeBackend: false });
    db.add(contact);
    const task1 = new Task({ title: 'Task1' }, { useAutomergeBackend: true });
    const task2 = new Task({ title: 'Task2' }, { useAutomergeBackend: false });

    contact.tasks.push(task1);
    contact.tasks.push(task2);

    task2.previous = task1;

    expect(contact.tasks[0]).to.eq(task1);
    expect(contact.tasks[1]).to.eq(task2);
    expect(task2.previous).to.eq(task1);
  });

  test.only('destructuring', () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));

    const obj = new Task({ title: 'Task' });
    const { title } = obj;
    expect(title).to.eq('Task');

    const { ...copy } = { ...obj };
    expect(copy.title).to.eq('Task');
  });
});
