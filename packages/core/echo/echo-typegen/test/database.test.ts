//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, db, id } from '@dxos/echo-schema';
import { createDatabase } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

import { Task } from './proto';

describe('database', () => {
  test.skip('saving', async () => { // TODO(burdon): Fix.
    const task = new Task({ title: 'test' });
    expect(task.title).to.eq('test');
    expect(task[id]).to.exist;
    expect(task[base]).to.exist;
    expect(task[db]).to.be.undefined;

    // TODO(burdon): Fails only in test.
    const database = await createDatabase();
    await database.save(task);
    expect(task[db]).to.exist;

    const tasks = database.query(Task.filter()).getObjects();
    expect(tasks).to.have.length(1);
    expect(tasks[0][id]).to.eq(task[id]);
  });
});
