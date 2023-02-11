//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { EditableList } from '@dxos/react-appkit';
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
  onDelete?: (task: Task) => void;
}> = withReactor(({ tasks, onCreate, onDrag, onDelete }) => {
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
      id={id in tasks ? (tasks as unknown as { [id]: string })[id] : randomString()}
      labelId='omitted'
      onMoveItem={onDrag}
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
