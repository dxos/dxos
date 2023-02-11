//
// Copyright 2022 DXOS.org
//

import { Spinner } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { EditableListItem } from '@dxos/react-appkit';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { mx, Input, List } from '@dxos/react-components';

import { useSpace } from '../hooks';
import { Task } from '../proto';

// TODO(burdon): Generic header with create.

export const TaskList: FC<{ completed?: boolean; readonly?: boolean; fullWidth?: boolean }> = ({
  completed = undefined,
  readonly = false,
  fullWidth = false
}) => {
  const space = useSpace(); // TODO(burdon): Factor out.
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
        <List labelId='excluded' variant='unordered'>
          {tasks?.map((task, index) => (
            <TaskItem
              key={task[id]}
              task={task}
              onSave={handleSave}
              onDelete={readonly ? undefined : handleDeleteTask}
              readonly={readonly}
            />
          ))}
        </List>

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
  return (
    <Input
      label='new task'
      slots={{
        input: {
          id: 'new-task',
          spellCheck: false,
          onKeyDown: ({ key }) => {
            if (key === 'Enter' && task.title.length) {
              onEnter?.(task);
              return true;
            }
          }
        },
        root: { className: 'w-full p-1' }
      }}
      defaultValue={task.title}
      placeholder='Enter text'
      onChange={({ target: { value } }) => {
        task.title = value;
      }}
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
}> = withReactor(
  ({ task, readonly, showAssigned, onEnter, onDelete, onSave }) => {
    useReactorContext({
      onChange: () => {
        onSave?.(task);
      }
    });

    return (
      <EditableListItem
        id={task[id]}
        completed={task.completed}
        onChangeCompleted={(completed) => (task.completed = completed)}
        title={task.title}
        onChangeTitle={({ target: { value } }) => {
          task.title = value ?? '';
        }}
        onClickDelete={() => onDelete?.(task)}
      />
    );
  },
  { componentName: 'TaskItem' }
);
