//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithoutRef, FC, KeyboardEvent, useState } from 'react';

import { Space } from '@dxos/client';
import {
  EditableList,
  EditableListItem,
  EditableListItemSlots,
  EditableListProps,
  useEditableListKeyboardInteractions
} from '@dxos/react-appkit';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { randomString } from '@dxos/react-components';

import { useSpace } from '../../hooks';
import { Task } from '../../proto';

// TODO(burdon): Generic header with create.

interface TaskListProps {
  space: Space;
  tasks: Task[];
  id?: string;
  unordered?: boolean;
  onDelete?: (task: Task) => void;
  onCreate?: (task: Task) => void;
  onMoveItem?: EditableListProps['onMoveItem'];
}

interface UnorderedTaskListProps extends Omit<TaskListProps, 'tasks' | 'unordered'> {
  filter?: Parameters<typeof Task.filter>[0];
}

export const UnorderedTaskList: FC<UnorderedTaskListProps> = ({ filter, ...props }) => {
  const space = useSpace(); // TODO(burdon): Factor out.
  const tasks = useQuery(space, Task.filter(filter));
  return <TaskList unordered tasks={tasks} {...props} />;
};

export const TaskList: FC<TaskListProps> = withReactor(
  ({ space, id: propsId, tasks, onCreate, onDelete, onMoveItem, unordered }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const listId = propsId ?? space.key.toHex() ?? randomString();
    const handleCreateTask = async () => {
      if (newTaskTitle.length) {
        const task = new Task({ title: newTaskTitle ?? '' });
        await space.db.add(task);
        setNewTaskTitle('');
        onCreate?.(task);
      }
    };

    const handleDeleteTask = async (task: Task) => {
      await space.db.remove(task);
      onDelete?.(task);
    };

    // TODO(burdon): DND prevents being editable.
    // TODO(burdon): Delete row.
    // TODO(burdon): Track index position; move up/down.
    // TODO(burdon): Highlight active row.
    // TODO(burdon): Check editable.
    // TODO(burdon): DragOverlay

    // TODO(burdon): Workflowy
    //  - Tab to indent.
    //  - Split current task if pressing Enter in the middle.

    const { hostAttrs, itemAttrs, onListItemInputKeyDown } = useEditableListKeyboardInteractions(listId);

    const onAddItemKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        void handleCreateTask();
      } else {
        onListItemInputKeyDown(event);
      }
    };

    const itemSlots = { input: { input: { ...itemAttrs, onKeyDown: onListItemInputKeyDown } } };

    return (
      <EditableList
        completable
        variant={unordered ? 'unordered' : 'ordered-draggable'}
        id={listId}
        labelId='omitted'
        itemIdOrder={tasks.map((task) => task.id)}
        nextItemTitle={newTaskTitle}
        slots={{
          root: hostAttrs as ComponentPropsWithoutRef<'div'>,
          addItemInput: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } }
        }}
        onMoveItem={onMoveItem}
        onChangeNextItemTitle={({ target: { value } }) => setNewTaskTitle(value)}
        onClickAdd={handleCreateTask}
      >
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} slots={itemSlots} />
        ))}
      </EditableList>
    );
  }
);

export const TaskItem: FC<{
  task: Task;
  onDelete?: (task: Task) => void;
  onSave?: (task: Task) => void;
  slots?: EditableListItemSlots;
}> = withReactor(
  ({ task, onDelete, onSave, slots }) => {
    useReactorContext({
      onChange: () => {
        onSave?.(task);
      }
    });

    return (
      <EditableListItem
        id={task.id}
        completed={task.completed}
        title={task.title}
        slots={slots}
        onChangeCompleted={(completed) => (task.completed = completed)}
        onChangeTitle={({ target: { value } }) => {
          task.title = value ?? '';
        }}
        {...(onDelete && { onClickDelete: () => onDelete(task) })}
      />
    );
  },
  { componentName: 'TaskItem' }
);
