//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { db, EchoDatabase, id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-uikit';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Contact, Task } from '../proto/tasks';
import { Card } from './Card';

export const createTask = async (db: EchoDatabase) => {
  const contacts = db.query(Contact.filter()).getObjects();
  const contact =
    faker.datatype.boolean() && contacts.length ? contacts[Math.floor(Math.random() * contacts.length)] : undefined;

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
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Tasks' color='bg-teal-400' menubar={<Menubar />}>
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
    <div className='flex ml-4 m-2 bg-white'>
      <table>
        <tbody>
          <tr>
            <td>
              <div className='flex mr-2'>
                <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
              </div>
            </td>
            <td>
              <div>
                <input
                  className='w-full outline-0'
                  value={task.title}
                  onChange={(e) => (task.title = e.target.value)}
                />
              </div>
            </td>
          </tr>
          <tr>
            <td></td>
            <td>
              <div className='flex text-sm text-blue-800'>{task.assignee?.name}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
