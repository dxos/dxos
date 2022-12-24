//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, Table } from '../components';
import { useObjects, useSelection, useSpace } from '../hooks';
import { createTask, Task } from '../proto';

export const TaskList: FC<{ completed?: boolean; readonly?: boolean; title?: string }> = ({
  completed = undefined,
  readonly = false,
  title = 'Tasks'
}) => {
  const { database: db } = useSpace();
  const tasks = useObjects(Task.filter({ completed }));

  const handleCreate = async () => {
    await createTask(db);
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <div className='p-3'>
        {tasks.map((task) => (
          <TaskItem key={id(task)} task={task} onCreateTask={handleCreate} />
        ))}
      </div>
    </Card>
  );
};

export const TaskItem: FC<{ task: Task; onCreateTask?: () => void }> = ({ task, onCreateTask }) => {
  useSelection([task, task.assignee]);

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
};
