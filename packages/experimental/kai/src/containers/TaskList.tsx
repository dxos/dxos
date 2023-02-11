//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { EditableList, EditableListItem, EditableListProps } from '@dxos/react-appkit';
import { useQuery, useReactorContext, withReactor } from '@dxos/react-client';
import { randomString } from '@dxos/react-components';

import { useSpace } from '../hooks';
import { Task } from '../proto';

// TODO(burdon): Generic header with create.

interface TaskListProps {
  tasks: Task[];
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

export const TaskList: FC<TaskListProps> = withReactor(({ tasks, onCreate, onDelete, onMoveItem, unordered }) => {
  const space = useSpace(); // TODO(burdon): Factor out.
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const handleCreateTask = async () => {
    if (newTaskTitle.length) {
      const task = new Task({ title: newTaskTitle ?? '' });
      await space.experimental.db.save(task);
      setNewTaskTitle('');
      onCreate?.(task);
    }
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

  return (
    <EditableList
      completable
      variant={unordered ? 'unordered' : 'ordered-draggable'}
      id={id in tasks ? (tasks as unknown as { [id]: string })[id] : randomString()}
      labelId='omitted'
      onMoveItem={onMoveItem}
      itemIdOrder={tasks.map((task) => task[id])}
      nextItemTitle={newTaskTitle}
      onChangeNextItemTitle={({ target: { value } }) => setNewTaskTitle(value)}
      onClickAdd={handleCreateTask}
    >
      {tasks.map((task) => (
        <TaskItem key={task[id]} task={task} onDelete={onDelete} />
      ))}
    </EditableList>
  );
});

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
