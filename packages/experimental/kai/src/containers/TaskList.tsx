//
// Copyright 2022 DXOS.org
//

import { Spinner } from 'phosphor-react';
import React, { ComponentPropsWithoutRef, FC, KeyboardEvent, useCallback, useState } from 'react';

import { id as idKey } from '@dxos/echo-schema';
import { EditableList, EditableListItem, useEditableListKeyboardInteractions } from '@dxos/react-appkit';
import { useQuery, withReactor } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-components';

import { useSpace } from '../hooks';
import { Task } from '../proto';

// TODO(burdon): Generic header with create.

export interface TaskListProps<K = { tasks: never }> {
  id: string;
  collection: { [Property in keyof K]: Task[] };
  tasksKey?: keyof K;
  readonly?: boolean;
}

export interface TaskListQueryProps extends Omit<TaskListProps, 'tasks'> {
  filter?: Parameters<typeof Task.filter>[0];
}

export const TaskListQuery: FC<TaskListQueryProps> = (props) => {
  const space = useSpace();
  const tasks = useQuery(space, Task.filter(props.filter));

  return <TaskList {...props} collection={{ tasks }} />;
};

export const TaskList: FC<TaskListProps> = ({ id, collection, tasksKey = 'tasks', readonly }) => {
  const space = useSpace(); // TODO(burdon): Factor out.
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation('kai');
  const listId = id;
  const labelId = `${listId}__label`;

  const [nextItemTitle, setNextItemTitle] = useState('');

  const { hostAttrs, itemAttrs, onListItemInputKeyDown } = useEditableListKeyboardInteractions(listId);

  console.log('Tasks', collection[tasksKey]);

  const addItem = useCallback(() => {
    if (nextItemTitle.length > 0) {
      setSaving(true);
      return space.experimental.db
        .save(
          new Task({
            title: nextItemTitle,
            completed: false
          })
        )
        .then((task) => {
          collection[tasksKey].push(task);
          setNextItemTitle('');
        })
        .finally(() => setSaving(false));
    }
  }, [space, nextItemTitle]);

  const deleteItem = useCallback(
    (taskToDelete: Task) => {
      setSaving(true);
      return space.experimental.db
        .delete(taskToDelete)
        .then(() => setNextItemTitle(''))
        .finally(() => setSaving(false));
    },
    [space]
  );

  const onAddItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        void addItem();
      } else {
        onListItemInputKeyDown(event);
      }
    },
    [onListItemInputKeyDown, addItem]
  );

  const taskItemAttrs = { ...itemAttrs, onKeyDown: onListItemInputKeyDown };

  const handleMoveItem = (oldIndex: number, newIndex: number) => {
    const [task] = collection[tasksKey].splice(oldIndex, 1);
    collection[tasksKey].splice(newIndex, 0, task);
  };

  return (
    <>
      <span className='sr-only' id={labelId}>
        {t('tasks list label')}
      </span>
      <EditableList
        completable
        id={listId}
        labelId={labelId}
        onClickAdd={addItem}
        nextItemTitle={nextItemTitle}
        itemIdOrder={collection[tasksKey].map((task) => task[idKey])}
        // todo (thure): let’s try without onChangeItemIdOrder here
        onMoveItem={handleMoveItem}
        onChangeNextItemTitle={({ target: { value } }) => setNextItemTitle(value)}
        slots={{
          root: hostAttrs as ComponentPropsWithoutRef<'div'>,
          addItemInput: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } },
          addItemButton: { disabled: nextItemTitle.length < 1 }
        }}
      >
        {collection[tasksKey]?.map((task) => (
          <TaskListItem key={task[idKey]} task={task} taskItemAttrs={taskItemAttrs} deleteTask={deleteItem} />
        ))}
      </EditableList>
      {saving && (
        <div className='absolute bottom-0 right-0 z-50 p-3 animate-spin text-red-600'>
          <Spinner />
        </div>
      )}
    </>
  );
};

export const TaskListItem = withReactor(
  ({
    task,
    deleteTask,
    taskItemAttrs
  }: {
    task: Task;
    deleteTask: (taskToDelete: Task) => Promise<void>;
    taskItemAttrs: ComponentPropsWithoutRef<'input'>;
  }) => {
    // const [title, setTitle] = useState(task.title);
    // const [completed, setCompleted] = useState(task.completed);
    return (
      <EditableListItem
        {...{
          id: task[idKey],
          title: task.title,
          onChangeTitle: ({ target: { value } }) => {
            task.title = value;
            // setTitle(value);
          },
          completed: task.completed,
          onChangeCompleted: (nextCompleted) => {
            task.completed = nextCompleted;
            // setCompleted(nextCompleted);
          },
          onClickDelete: () => deleteTask(task),
          slots: { input: { input: taskItemAttrs } }
        }}
      />
    );
  },
  { componentName: 'TaskListItem' }
);
