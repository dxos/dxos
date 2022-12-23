//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { EchoDatabase, id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, Table } from '../components';
import { makeReactive, useDatabase, useObjects, useSelection } from '../hooks';
import { Contact, Task } from '../proto';

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
  const tasks = useObjects(Task.filter());

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
      <div className='p-3'>
        {tasks.map((task) => (
          <TaskItem key={id(task)} task={task} onCreateTask={handleCreate} />
        ))}
      </div>
    </Card>
  );
};

export const TaskItem = makeReactive<{ task: Task; onCreateTask?: () => void }>(({ task, onCreateTask }) => {
  // TODO(burdon): Insert item on enter and focus new item.
  // const handleKeyDown = (event: KeyboardEvent) => {
  //   if (event.key === 'Enter') {
  //     onCreateTask?.();
  //   }
  // };

  return (
    <Table
      sidebar={
        <input
          type='checkbox'
          spellCheck={false}
          checked={!!task.completed}
          onChange={() => (task.completed = !task.completed)}
        />
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={task.title}
          // onKeyDown={handleKeyDown}
          onChange={(value) => (task.title = value)}
        />
      }
    >
      <div className='text-sm text-blue-800'>
        <div>{task.assignee?.name}</div>
      </div>
    </Table>
  );
});
