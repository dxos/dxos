//
// Copyright 2022 DXOS.org
//

import { PlusCircle, Spinner, XCircle } from 'phosphor-react';
import React, { FC, KeyboardEvent, useCallback, useEffect, useState } from 'react';

import { base, deleted, id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { getSize, mx, useThemeContext } from '@dxos/react-components';

import { Button, Card, Input, CardRow, CardMenu } from '../components';
import { useAppState, useSpace } from '../hooks';
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
  const { hasIosKeyboard } = useThemeContext();

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
      <div className={'flex flex-col overflow-y-scroll pt-2 bg-white w-screen is-full md:is-[400px] relative'}>
        <div className={'mt-2 pli-3'}>
          {tasks?.map((task, index) => (
            <TaskItem
              key={task[id]}
              task={task}
              onSave={handleSave}
              onDelete={readonly ? undefined : handleDeleteTask}
              readonly={readonly}
              orderIndex={index}
              isLast={index === tasks.length - 1}
            />
          ))}
        </div>

        {/* TODO(burdon): Keep pinned to bottom on create. */}
        {newTask && (
          <div
            className={mx(
              'bg-white pli-3 pbs-2 pbe-4',
              !hasIosKeyboard && 'focus-within:sticky focus-within:block-end-0'
            )}
          >
            <NewTaskItem task={newTask} onEnter={handleCreateTask} lastIndex={tasks.length - 1} />
          </div>
        )}
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
  lastIndex?: number;
}> = ({ task, onEnter, lastIndex }) => {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<Element>) => {
      if (e.key === 'PageUp') {
        e.preventDefault();
        (document.querySelector(`input[data-orderindex="${lastIndex ?? 0}"]`) as HTMLElement | undefined)?.focus();
      }
    },
    [lastIndex]
  );
  return (
    <CardRow
      sidebar={
        <div className='flex flex-shrink-0 justify-center w-6 invisible'>
          <input type='checkbox' autoFocus disabled />
        </div>
      }
      header={
        <Input
          id='new-task'
          className='w-full p-1'
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onKeyDown={onKeyDown}
          onEnter={(value) => {
            if (value.length) {
              task.title = value;
              onEnter?.(task);
              return true;
            }
          }}
          onChange={(value) => {
            task.title = value;
          }}
          autoFocus
        />
      }
    />
  );
};

export const TaskItem: FC<{
  task: Task;
  readonly?: boolean;
  showAssigned?: boolean;
  onDelete?: (task: Task) => void;
  onSave?: (task: Task) => void;
  isLast?: boolean;
  orderIndex: number;
}> = withReactor(({ task, readonly, showAssigned, onDelete, onSave, orderIndex, isLast }) => {
  const { debug } = useAppState();
  useReactorContext({
    onChange: () => {
      onSave?.(task);
    }
  });

  const onKeyDown = useCallback(
    (e: KeyboardEvent<Element>) => {
      switch (e.key) {
        case 'PageDown':
          e.preventDefault();
          if (isLast) {
            (document.querySelector('input#new-task') as HTMLElement | undefined)?.focus();
          } else {
            (document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined)?.focus();
          }
          break;
        case 'PageUp':
          e.preventDefault();
          (document.querySelector(`input[data-orderindex="${orderIndex - 1}"]`) as HTMLElement | undefined)?.focus();
          break;
      }
    },
    [task, orderIndex, isLast]
  );

  const onKeyUp = useCallback(
    (e: KeyboardEvent<Element>) => {
      switch (e.key) {
        case 'Enter':
          if (e.shiftKey) {
            (document.querySelector(`input[data-orderindex="${orderIndex - 1}"]`) as HTMLElement | undefined)?.focus();
          } else {
            if (isLast) {
              (document.querySelector('input#new-task') as HTMLElement | undefined)?.focus();
            } else {
              (
                document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined
              )?.focus();
            }
          }
          break;
      }
    },
    [task, orderIndex, isLast]
  );

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
          className={mx('w-full p-1', task[deleted] && 'text-red-300')}
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onChange={(value) => {
            task.title = value;
          }}
          disabled={readonly}
          data-orderindex={orderIndex}
        />
      }
    >
      {showAssigned && (
        <div className='ml-8 pl-1 text-sm text-blue-800'>
          <div>{task.assignee?.name}</div>
          {debug && (
            <div>
              <div>{PublicKey.from(task[id]).truncate()}</div>
              <div>{(task[base] as any)._schemaType?.name}</div>
            </div>
          )}
        </div>
      )}
    </CardRow>
  );
});
