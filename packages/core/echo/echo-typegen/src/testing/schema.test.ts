//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { id } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Contact, Task } from './proto';

// TODO(burdon): Need to trigger typegen before test.

describe('schema', () => {
  test('keys', () => {
    const contact = new Contact();
    expect(Object.keys(contact).length).to.eq(5);

    // TODO(burdon): Test after saved with test database.
    expect(contact[id]).to.be.undefined;
  });

  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(contact.toJSON()).to.deep.eq({ name: 'User 1' });

    const task1 = new Task();
    task1.title = 'Task 1';
    expect(task1.title).to.eq('Task 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1' });

    task1.assignee = contact;
    expect(task1.assignee.name).to.eq('User 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1', assignee: { name: 'User 1' } });
    expect(JSON.stringify(task1)).to.eq(JSON.stringify({ title: 'Task 1', assignee: { name: 'User 1' } }));

    // Test recursion.
    {
      const task2 = new Task();
      task2.title = 'Task 2';

      contact.tasks.push(task1);
      contact.tasks.push(task2);

      expect(contact.toJSON()).to.deep.eq({
        name: 'User 1',
        tasks: [
          {
            title: 'Task 1',
            assignee: {
              name: 'User 1',
              tasks: [
                {
                  title: 'Task 1'
                },
                {
                  title: 'Task 2'
                }
              ]
            }
          },
          {
            title: 'Task 2'
          }
        ]
      });
    }

    // TODO(burdon): Test sets.
    // TODO(burdon): Implement Task.from to deserialize JSON string.
  });
});
