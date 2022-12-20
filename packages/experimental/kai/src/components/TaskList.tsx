//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { Plus } from 'phosphor-react';
import React, { FC } from 'react';

import { db, EchoDatabase, id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-uikit';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Contact, Task } from '../proto/tasks';
import { Card } from './Card';

export const createTask = async (db: EchoDatabase) => {
  const contacts = db.query(Contact.filter()).getObjects();
  const contact = contacts[Math.floor(Math.random() * contacts.length)];

  return await db.save(
    new Task({
      title: faker.lorem.sentence(2),
      assignee: contact
    })
  );
};

export const TaskList: FC<{}> = () => {
  const db = useDatabase();
  const tasks = useObjects(db, Task.filter());

  const handleCreate = async () => {
    await createTask(db);
  };

  const Menubar = () => (
    <div className='flex p-2 bg-green-400'>
      <h2>Tasks</h2>
      <div className='flex-1' />
      <button className='mr-2' onClick={handleCreate}>
        <Plus className={getSize(5)} />
      </button>
    </div>
  );

  return (
    <Card menubar={<Menubar />}>
      <>
        {tasks.map((task) => (
          <TaskItem key={id(task)} task={task} />
        ))}
      </>
    </Card>
  );
};

export const TaskItem: FC<{ task: Task }> = ({ task }) => {
  useSelection(db(task), [task, task.assignee]);

  return (
    <div className='flex flex-col bg-white'>
      <div className='flex'>
        <input
          type='checkbox'
          className='m-2'
          checked={!!task.completed}
          onChange={() => (task.completed = !task.completed)}
        />
        <input className='w-full outline-0' value={task.title} onChange={(e) => (task.title = e.target.value)} />
      </div>

      <div>
        <div className='flex ml-8 mb-2 text-sm text-blue-800'>{task.assignee?.name}</div>
      </div>
    </div>
  );
};
