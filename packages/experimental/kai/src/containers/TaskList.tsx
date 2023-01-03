//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { PlusCircle, Spinner, XCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { deleted, id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { useQuery, useReactor } from '@dxos/react-client';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (saving) {
      if (t) {
        clearTimeout(t);
      }
      t = setTimeout(() => {
        setSaving(false);
      }, 1000);
    }

    return () => clearTimeout(t);
  }, [saving]);

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

  const handleDeleteTask = async (task: Task) => {
    await space.experimental.db.delete(task);
  };

  const handleSave = () => {
    setSaving(true);
  };

  const Menubar = () => (
    <button onClick={handleGenerateTask}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <div className='flex flex-col flex-1 overflow-y-scroll'>
        <div className={'mt-2'}>
          {tasks?.map((task) => (
            <TaskItem key={task[id]} task={task} onSave={handleSave} onDelete={handleDeleteTask} readonly={readonly} />
          ))}
        </div>

        <div>{newTask && <NewTaskItem task={newTask} onEnter={handleCreateTask} />}</div>
      </div>

      {saving && (
        <div className='flex justify-end p-1 text-red-500'>
          <Spinner />
        </div>
      )}
    </Card>
  );
};

export const NewTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
}> = ({ task, onEnter }) => {
  return (
    <TableRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6 invisible'>
          <input type='checkbox' autoFocus disabled />
        </div>
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
    />
  );
};

export const TaskItem: FC<{
  task: Task;
  readonly?: boolean;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onSave?: (task: Task) => void;
}> = ({ task, readonly, onEnter, onDelete, onSave }) => {
  const { debug } = useOptions();
  const { render } = useReactor({
    onChange: () => {
      onSave?.(task);
    }
  });

  return render(
    <TableRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6'>
          <input
            type='checkbox'
            disabled={readonly}
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
          disabled={readonly}
        />
      }
    >
      <div className='ml-8 text-sm text-blue-800'>
        {debug && <div>{PublicKey.from(task[id]).truncate()}</div>}
        <div>{task.assignee?.name}</div>
        <div>[{task[deleted] ? 'del' : 'ok'}]</div>
      </div>
    </TableRow>
  );
};
