//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithoutRef, KeyboardEvent, useState } from 'react';

import { Task } from '@dxos/kai-types';
import {
  EditableList,
  EditableListItem,
  EditableListItemSlots,
  EditableListProps,
  useEditableListKeyboardInteractions,
} from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';

export type TaskListProps = {
  id: string;
  tasks: Task[];
  onCreateItem?: (task: Task) => void;
  onDeleteItem?: (task: Task) => void;
  onMoveItem?: EditableListProps['onMoveItem'];
};

// TODO(burdon): Make generic and remove observer.
export const TaskList = observer(({ id, tasks, onCreateItem, onDeleteItem, onMoveItem }: TaskListProps) => {
  const [title, setTitle] = useState('');
  const { hostAttrs, itemAttrs, onListItemInputKeyDown } = useEditableListKeyboardInteractions(id);
  const itemSlots = { input: { input: { ...itemAttrs, onKeyDown: onListItemInputKeyDown } } };

  const handleCreateTask = async () => {
    if (title.length) {
      const task = new Task({ title: title ?? '' });
      onCreateItem?.(task);
      setTitle('');
    }
  };

  const onAddItemKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleCreateTask();
    } else {
      onListItemInputKeyDown(event);
    }
  };

  return (
    <EditableList
      id={id}
      completable
      variant={onMoveItem ? 'ordered-draggable' : 'unordered'}
      density='coarse'
      labelId='omitted'
      itemIdOrder={tasks.map((task) => task.id)}
      nextItemTitle={title}
      slots={{
        root: hostAttrs as ComponentPropsWithoutRef<'div'>,
        addItemInput: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } },
      }}
      onMoveItem={onMoveItem}
      onChangeNextItemTitle={({ target: { value } }) => setTitle(value)}
      onClickAdd={handleCreateTask}
    >
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onDelete={onDeleteItem} slots={itemSlots} />
      ))}
    </EditableList>
  );
});

export type TaskItemProps = {
  slots?: EditableListItemSlots;
  task: Task;
  onDelete?: (task: Task) => void;
};

// TODO(burdon): Make generic and remove observer.
export const TaskItem = observer(({ slots, task, onDelete }: TaskItemProps) => {
  return (
    <EditableListItem
      id={task.id}
      completed={task.completed}
      title={task.title}
      slots={{
        ...slots,
        selectableCheckbox: {
          className:
            'radix-state-checked:bg-white radix-state-unchecked:bg-white radix-state-checked:border radix-state-unchecked:border border-primary-600 text-primary-600',
        },
      }}
      onChangeCompleted={(completed) => (task.completed = completed)}
      onChangeTitle={({ target: { value } }) => {
        task.title = value ?? '';
      }}
      {...(onDelete && { onClickDelete: () => onDelete(task) })}
    />
  );
});
