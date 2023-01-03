//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { PlusCircle, XCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { useQuery, useReactor, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, TableRow } from '../components';
import { useOptions, useSpace } from '../hooks';
import { createTask, Task } from '../proto';

/**
 * Sortable task list.
 * https://docs.dndkit.com/presets/sortable
 */
// TODO(burdon): Reuse in Project.
export const TaskList: FC<{ completed?: boolean; readonly?: boolean; title?: string }> = ({
  completed = undefined,
  readonly = false,
  title = 'Tasks'
}) => {
  const { space } = useSpace();
  const tasks = useQuery(space, Task.filter({ completed }));
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    if (!readonly) {
      setNewTask(new Task());
    }
  }, []);

  const handleGenerateTask = async () => {
    await createTask(space.experimental.db);
  };

  const handleCreateTask = async (task: Task) => {
    if (task.title.length) {
      await space.experimental.db.save(task);
      setNewTask(new Task());
    }
  };

  const Menubar = () => (
    <button onClick={handleGenerateTask}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <div className='mt-2'>
        {tasks?.map((task) => (
          <TaskItem key={task[id]} task={task} />
        ))}
      </div>

      <div className='mt-2'>{newTask && <NewTaskItem task={newTask} onEnter={handleCreateTask} />}</div>
    </Card>
  );
};

export const NewTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
}> = ({ task, onEnter }) => {
  const { render } = useReactor();

  return render(
    <TableRow
      sidebar={<div className='flex flex-shrink-0 ml-5 mr-1'></div>}
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onEnter={() => {
            onEnter?.(task);
          }}
          onChange={(value) => {
            task.title = value;
          }}
        />
      }
    />
  );
};

export const TaskItem = withReactor<{
  task: Task;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}>(({ task, onEnter, onDelete }) => {
  const { debug } = useOptions();

  return (
    <TableRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6'>
          <input
            type='checkbox'
            spellCheck={false}
            checked={!!task.completed}
            onChange={() => (task.completed = !task.completed)}
          />
        </div>
      }
      action={
        onDelete && (
          <button className='text-gray-300' onClick={() => onDelete(task)}>
            <XCircle className={clsx(getSize(6), 'hover:text-red-400')} />
          </button>
        )
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onEnter={() => {
            onEnter?.(task);
          }}
          onChange={(value) => {
            task.title = value;
          }}
        />
      }
    >
      <div className='ml-8 text-sm text-blue-800'>
        {debug && <div>{PublicKey.from(task[id]).truncate()}</div>}
        <div>{task.assignee?.name}</div>
      </div>
    </TableRow>
  );
});
