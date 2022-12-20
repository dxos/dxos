//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { FC } from 'react';

import { EchoDatabase, EchoObject } from '@dxos/echo-db2';

import { id, useDatabase, useObjects, useSelection } from '../hooks';

export const TaskList: FC<{}> = () => {
  const db = useDatabase();
  const tasks = useObjects(db, { type: 'task' });

  const handleCreate = async () => {
    const contacts = db.query({ type: 'person' }).getObjects();
    const contact = faker.random.boolean() && contacts.length && contacts[Math.floor(Math.random() * contacts.length)];

    await db!.save(
      new EchoObject({
        type: 'task',
        title: faker.lorem.sentence(),
        assignee: contact
      })
    );
  };

  return (
    <div className='flex-1 m-1 border-2 border-sky-500'>
      <div className='flex'>
        <h2 className='p-2'>Tasks</h2>
        <div className='flex-1' />
        <button className='mr-2 rounded-full' onClick={handleCreate}>
          Create
        </button>
      </div>

      <div>
        {tasks?.map((task: EchoObject) => (
          <Task key={id(task)} task={task} db={db!} />
        ))}
      </div>
    </div>
  );
};

export const Task: FC<{ task: EchoObject; db: EchoDatabase }> = ({ task, db }) => {
  useSelection(db, [task, task.assignee]);

  return (
    <div>
      <div className='flex bg-white'>
        <input
          type='checkbox'
          className='m-2'
          checked={!!task.complete}
          onChange={() => (task.complete = !task.complete)}
        />
        <input className='w-full p-1 outline-0' value={task.title} onChange={(e) => (task.title = e.target.value)} />
      </div>
      <div>{task.assignee.name}</div>
    </div>
  );
};
