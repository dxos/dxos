//
// Copyright 2022 DXOS.org
//

import { Spinner } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { EditableList, EditableListItem } from '@dxos/react-appkit';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { mx } from '@dxos/react-components';

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
  const [newTaskTitle, setNewTaskTitle] = useState('');
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

  const handleCreateTask = async (task: Task) => {
    if (task.title.length) {
      await space.experimental.db.save(task);
      setNewTaskTitle('');
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
        <EditableList
          variant='unordered'
          id={space.key.toHex()}
          labelId='excluded'
          onClickAdd={() => handleCreateTask(new Task({ title: newTaskTitle ?? '' }))}
          nextItemTitle={newTaskTitle}
          onChangeNextItemTitle={({ target: { value } }) => {
            setNewTaskTitle(value);
          }}
        >
          {tasks?.map((task, index) => (
            <TaskItem
              key={task[id]}
              task={task}
              onSave={handleSave}
              onDelete={readonly ? undefined : handleDeleteTask}
              readonly={readonly}
            />
          ))}
        </EditableList>
      </div>
      {saving && (
        <div className='absolute bottom-0 right-0 z-50 p-3 animate-spin text-red-600'>
          <Spinner />
        </div>
      )}
    </>
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
