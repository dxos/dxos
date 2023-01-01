//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { id, OrderedSet } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Task } from './proto';

describe('ordered-set', () => {
  // TODO(burdon): Factor out test suite.
  test('ordered set', () => {
    const task = new Task();
    expect(task.subTasks).to.have.length(0);

    // TODO(burdon): Implement assignment = [].
    task.subTasks.push(new Task());
    task.subTasks.push(new Task());
    task.subTasks.push(new Task());
    expect(task.subTasks).to.have.length(3);
    const ids = task.subTasks.map((task) => task[id]);
    task.subTasks.forEach((task, i) => expect(task[id]).to.eq(ids[i]));

    task.subTasks.splice(0, 2, new Task());
    expect(task.subTasks).to.have.length(2);
    expect(task.subTasks[1][id]).to.eq(ids[2]);

    const tasks = Array.from(task.subTasks.values());
    expect(tasks).to.have.length(2);
  });

  test('ordered set assignment', () => {
    const task = new Task();
    expect(task.subTasks).to.have.length(0);

    task.subTasks = new OrderedSet([new Task(), new Task(), new Task()]);
    expect(task.subTasks).to.have.length(3);
  });
});
