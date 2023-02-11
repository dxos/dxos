//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { EditableList, EditableListProps } from '@dxos/react-appkit';
import { withReactor } from '@dxos/react-client';
import { randomString } from '@dxos/react-components';

import { useSpace } from '../hooks';
import { Task } from '../proto';
import { TaskItem } from './TaskList';

/**
 * Sortable task list.
 * https://docs.dndkit.com/presets/sortable
 */
export const DraggableTaskList: FC<{
  tasks: Task[];
  onCreate?: (task: Task) => void;
  onDrag?: (active: number, over: number) => void;
}> = withReactor(({ tasks, onCreate, onDrag }) => {
  const space = useSpace(); // TODO(burdon): Factor out.
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    setNewTask(new Task());
  }, []);

  const handleCreateTask = async (task: Task) => {
    if (task.title?.length) {
      await space.experimental.db.save(task);
      onCreate?.(task);
      setNewTask(new Task());
    }
  };

  const handleDragEnd = (i1: number, i2: number) => {
    if (onDrag) {
      onDrag(i1, i2);
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
    <div>
      <DraggableTaskListContainer
        items={tasks.map((task) => task[id])}
        onMoveItem={onDrag ? handleDragEnd : undefined}
        tasks={tasks}
        newTask={newTask}
        onCreate={handleCreateTask}
      />
    </div>
  );
});

export const DraggableTaskListContainer: FC<{
  tasks: Task[];
  items: string[];
  onMoveItem?: EditableListProps['onMoveItem'];
  newTask?: Task;
  onCreate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = withReactor(({ tasks, newTask, onCreate, onDelete, items, onMoveItem }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  return (
    <>
      <EditableList
        completable
        id={id in tasks ? (tasks as unknown as { [id]: string })[id] : randomString()}
        labelId='omitted'
        onMoveItem={onMoveItem}
        itemIdOrder={items}
        nextItemTitle={newTaskTitle}
        onChangeNextItemTitle={({ target: { value } }) => setNewTaskTitle(value)}
        onClickAdd={() => {
          onCreate?.(new Task({ title: newTaskTitle ?? '' }));
          setNewTaskTitle('');
        }}
      >
        {tasks.map((task) => (
          <DraggableTaskItem key={task[id]} task={task} onDelete={onDelete} />
        ))}
      </EditableList>
    </>
  );
});

export const DraggableTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = withReactor(({ task, onEnter, onDelete }) => {
  // TODO(burdon): Dragging doesn't handle variable height items?
  return <TaskItem {...{ task, onDelete, onEnter }} />;
});
