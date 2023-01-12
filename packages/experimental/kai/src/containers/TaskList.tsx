//
// Copyright 2022 DXOS.org
//

import { PlusCircle, Spinner, XCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { base, deleted, id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, Card, Input, CardRow, CardMenu } from '../components';
import { useOptions, useSpace } from '../hooks';
import { createTask, Task } from '../proto';

// TODO(burdon): Generic header with create.

export const TaskListCard: FC<{ completed?: boolean; readonly?: boolean; title?: string }> = ({
  completed = undefined,
  readonly = false,
  title = 'Tasks'
}) => {
  const { space } = useSpace();

  const handleGenerateTask = async () => {
    await createTask(space.experimental.db);
  };

  const Header = () => (
    <CardMenu title={title}>
      {!readonly && (
        <Button onClick={handleGenerateTask}>
          <PlusCircle className={getSize(5)} />
        </Button>
      )}
    </CardMenu>
  );

  return (
    <Card fade scrollbar header={<Header />}>
      <TaskList completed={completed} readonly={readonly} />
    </Card>
  );
};

export const TaskList: FC<{ completed?: boolean; readonly?: boolean }> = ({
  completed = undefined,
  readonly = false
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

  return (
    <div className='flex flex-1 justify-center bg-gray-100'>
      <div className='flex flex-col overflow-y-scroll pl-3 pr-3 pt-2 pb-8 bg-white is-full md:is-[400px]'>
        <div className={'mt-2'}>
          {tasks?.map((task) => (
            <TaskItem
              key={task[id]}
              task={task}
              onSave={handleSave}
              onDelete={readonly ? undefined : handleDeleteTask}
              readonly={readonly}
            />
          ))}
        </div>

        {/* TODO(burdon): Keep pinned to bottom on create. */}
        <div>{newTask && <NewTaskItem task={newTask} onEnter={handleCreateTask} />}</div>
      </div>

      {saving && (
        <div className='absolute bottom-0 right-0 z-50 p-3 animate-spin text-red-600'>
          <Spinner />
        </div>
      )}
    </div>
  );
};

export const NewTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
}> = ({ task, onEnter }) => {
  return (
    <CardRow
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
}> = withReactor(({ task, readonly, onEnter, onDelete, onSave }) => {
  const { debug } = useOptions();
  useReactorContext({
    onChange: () => {
      onSave?.(task);
    }
  });

  return (
    <CardRow
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
          <Button className='text-gray-300' onClick={() => onDelete(task)}>
            <XCircle className={mx(getSize(6), 'hover:text-red-400')} />
          </Button>
        )
      }
      header={
        <Input
          className={mx('w-full outline-0', task[deleted] && 'text-red-300')}
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
        <div>{task.assignee?.name}</div>
        {debug && (
          <div>
            <div>{PublicKey.from(task[id]).truncate()}</div>
            <div>{(task[base] as any)._schemaType?.name}</div>
          </div>
        )}
      </div>
    </CardRow>
  );
});
