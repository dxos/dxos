//
// Copyright 2022 DXOS.org
//

import { DndContext, useDndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { useCurrentSpace, withReactor } from '@dxos/react-client';

import { Button } from '../components';
import { Task } from '../proto';
import { TaskItem, NewTaskItem } from './TaskList';

/**
 * Sortable task list.
 * https://docs.dndkit.com/presets/sortable
 */
export const DraggableTaskList: FC<{
  tasks: Task[];
  onCreate?: (task: Task) => void;
  onDrag?: (active: number, over: number) => void;
}> = withReactor(({ tasks, onCreate, onDrag }) => {
  const [space] = useCurrentSpace();
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    setNewTask(new Task());
  }, []);

  const handleCreateTask = async (task: Task) => {
    if (task.title?.length) {
      await space?.experimental.db.save(task);
      onCreate?.(task);
      setNewTask(new Task());
    }
  };

  const handleDragEnd = ({ active, over }: any) => {
    if (onDrag && over?.id && active.id !== over?.id) {
      const i1 = tasks.findIndex((task) => task[id] === active.id);
      const i2 = tasks.findIndex((task) => task[id] === over.id);
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
      <DndContext onDragEnd={onDrag ? handleDragEnd : undefined} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={tasks.map((task) => task[id])}>
          <DraggableTaskListContainer tasks={tasks} newTask={newTask} onCreate={handleCreateTask} />
        </SortableContext>
      </DndContext>
    </div>
  );
});

export const DraggableTaskListContainer: FC<{
  tasks: Task[];
  newTask?: Task;
  onCreate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = withReactor(({ tasks, newTask, onCreate, onDelete }) => {
  const { active } = useDndContext();

  // TODO(burdon): Order isn't reliable after dragging.
  return (
    <div>
      {tasks.map((task, index) => (
        <DraggableTaskItem
          key={task[id]}
          task={task}
          onDelete={onDelete}
          orderIndex={index}
          isLast={index === tasks.length - 1}
        />
      ))}

      {newTask && (
        <div className='flex ml-7' style={active ? { visibility: 'hidden' } : {}}>
          <NewTaskItem task={newTask} onEnter={onCreate} />
        </div>
      )}
    </div>
  );
});

export const DraggableTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  orderIndex: number;
  isLast?: boolean;
}> = withReactor(({ task, onEnter, onDelete, orderIndex, isLast }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task[id] });

  // TODO(burdon): Dragging doesn't handle variable height items?
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} className='flex flex-1 items-center ml-3' style={style}>
      <Button className='w-4' {...listeners} {...attributes}>
        <DotsSixVertical />
      </Button>

      <TaskItem {...{ task, onDelete, onEnter, orderIndex, isLast }} />
    </div>
  );
});
