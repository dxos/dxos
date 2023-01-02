//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { id } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Contact, Task } from './proto';

// TODO(burdon): Test with database.
// TODO(burdon): Implement Task.from to deserialize JSON string.

describe('schema', () => {
  test('keys', () => {
    const contact = new Contact();
    expect(contact[id]).to.exist;
    expect(Object.keys(contact).length).to.eq(5);

    // TODO(burdon): Test after saved with test database.
    expect(contact[id]).to.be.a('string'); // TODO(burdon): Expose as property.
  });

  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(contact.toJSON()).to.deep.eq({ name: 'User 1' }); // TODO(burdon): Add id.

    const task1 = new Task();
    task1.title = 'Task 1';
    expect(task1.title).to.eq('Task 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1' });

    task1.assignee = contact;
    expect(task1.assignee.name).to.eq('User 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1', assignee: { id: contact[id] } });
    expect(JSON.stringify(task1)).to.eq(JSON.stringify({ title: 'Task 1', assignee: { id: contact[id] } }));
  });

  test('json with recursion', () => {
    const contact = new Contact({ name: 'User 1' });
    contact.tasks.push(new Task({ title: 'Task 1', assignee: contact }));
    contact.tasks.push(new Task({ title: 'Task 2', assignee: contact }));

    expect(contact.toJSON()).to.deep.eq({
      name: 'User 1',
      tasks: [
        {
          id: contact.tasks[0][id]
        },
        {
          id: contact.tasks[1][id]
        }
      ]
    });
  });
});
