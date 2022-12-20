//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { FC } from 'react';

import { EchoDatabase, id } from '@dxos/echo-db2';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Contact, Task } from '../proto/tasks';

export const TaskList: FC<{}> = () => {
  const db = useDatabase();
  const tasks = useObjects(db, Task.filter());

  const handleCreate = async () => {
    const contacts = db.query(Contact.filter()).getObjects();
    const contact = contacts[Math.floor(Math.random() * contacts.length)];

    await db.save(
      new Task({
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
        {tasks.map((task) => (
          <TaskItem key={id(task)} task={task} db={db!} />
        ))}
      </div>
    </div>
  );
};

export const TaskItem: FC<{ task: Task; db: EchoDatabase }> = ({ task, db }) => {
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
      <div>{task.assignee?.name}</div>
    </div>
  );
};
