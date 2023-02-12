//
// Copyright 2022 DXOS.org
//

import { Spinner, XCircle } from 'phosphor-react';
import React, { FC, KeyboardEvent, useCallback, useEffect, useState } from 'react';

import { Space } from '@dxos/client';
import { base, deleted, id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, Input, CardRow } from '../../components';
import { useAppState } from '../../hooks';
import { Task } from '../../proto';

// TODO(burdon): Generic header with create.

export const TaskList: FC<{ space: Space; completed?: boolean; readonly?: boolean; fullWidth?: boolean }> = ({
  space,
  completed = undefined,
  readonly = false,
  fullWidth = false
}) => {
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
    <>
      {/* TODO(burdon): Adapt width to container. */}
      <div
        className={mx('flex flex-col overflow-y-auto bg-white', fullWidth ? 'w-full' : 'w-screen is-full md:is-column')}
      >
        <div className='mt-1'>
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
        {newTask && <NewTaskItem task={newTask} onEnter={handleCreateTask} lastIndex={tasks.length - 1} />}
      </div>
      {saving && (
        <div className='absolute bottom-0 right-0 z-50 p-3 animate-spin text-red-600'>
          <Spinner />
        </div>
      )}
    </>
  );
};

export const NewTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
  lastIndex?: number;
}> = ({ task, onEnter, lastIndex }) => {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      if (event.key === 'PageUp') {
        event.preventDefault();
        (document.querySelector(`input[data-orderindex="${lastIndex ?? 0}"]`) as HTMLElement | undefined)?.focus();
      }
    },
    [lastIndex]
  );

  return (
    <CardRow
      sidebar={<input className='invisible' type='checkbox' disabled />}
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
        />
      }
      action={<div />}
    />
  );
};

export const TaskItem: FC<{
  task: Task;
  readonly?: boolean;
  showAssigned?: boolean;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onSave?: (task: Task) => void;
  isLast?: boolean;
  orderIndex: number;
}> = withReactor(
  ({ task, readonly, showAssigned, onEnter, onDelete, onSave, orderIndex, isLast }) => {
    const { debug } = useAppState();
    useReactorContext({
      onChange: () => {
        onSave?.(task);
      }
    });

    const onKeyDown = useCallback(
      (event: KeyboardEvent<Element>) => {
        switch (event.key) {
          case 'PageDown': {
            event.preventDefault();
            if (isLast) {
              (document.querySelector('input#new-task') as HTMLElement | undefined)?.focus();
            } else {
              (
                document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined
              )?.focus();
            }
            break;
          }
          case 'PageUp': {
            event.preventDefault();
            (document.querySelector(`input[data-orderindex="${orderIndex - 1}"]`) as HTMLElement | undefined)?.focus();
            break;
          }
        }
      },
      [task, orderIndex, isLast]
    );

    const onKeyUp = useCallback(
      (event: KeyboardEvent<Element>) => {
        switch (event.key) {
          case 'Enter': {
            if (event.shiftKey) {
              (
                document.querySelector(`input[data-orderindex="${orderIndex - 1}"]`) as HTMLElement | undefined
              )?.focus();
            } else {
              if (isLast) {
                (document.querySelector('input#new-task') as HTMLElement | undefined)?.focus();
              } else {
                (
                  document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined
                )?.focus();
              }
            }
            onEnter?.(task);
            break;
          }
        }
      },
      [task, orderIndex, isLast]
    );

    return (
      <CardRow
        sidebar={
          <input
            type='checkbox'
            disabled={readonly}
            checked={!!task.completed}
            onChange={() => (task.completed = !task.completed)}
          />
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
  },
  { componentName: 'TaskItem' }
);
