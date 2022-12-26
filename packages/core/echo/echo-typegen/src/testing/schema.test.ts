//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { id } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Contact, Task } from './proto';

describe('schema', () => {
  test('keys', () => {
    const contact = new Contact();
    expect(Object.keys(contact).length).to.eq(4);

    // TODO(burdon): Test after saved with test database.
    expect(contact[id]).to.be.undefined;
  });

  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(contact.toJSON()).to.deep.eq({ name: 'User 1' });

    const task = new Task();
    task.title = 'Task 1';
    expect(task.title).to.eq('Task 1');
    expect(task.toJSON()).to.deep.eq({ title: 'Task 1' });

    task.assignee = contact;
    expect(task.assignee.name).to.eq('User 1');
    expect(task.toJSON()).to.deep.eq({ title: 'Task 1', assignee: { name: 'User 1' } });
    expect(JSON.stringify(task)).to.eq(JSON.stringify({ title: 'Task 1', assignee: { name: 'User 1' } }));

    // TODO(burdon): Implement Task.from to deserialize JSON string.
  });
});
