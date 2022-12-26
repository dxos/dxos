//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { json } from '@dxos/echo-db2';
import { describe, test } from '@dxos/test';

import { Contact, Task } from './proto';

describe('schema', () => {
  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(json(contact)).to.deep.eq({ name: 'User 1' });

    const task = new Task();
    task.title = 'Task 1';
    expect(task.title).to.eq('Task 1');
    expect(json(task)).to.deep.eq({ title: 'Task 1' });

    task.assignee = contact;
    expect(task.assignee.name).to.eq('User 1');
    expect(json(task)).to.deep.eq({ title: 'Task 1', assignee: { name: 'User 1' } });
  });
});
