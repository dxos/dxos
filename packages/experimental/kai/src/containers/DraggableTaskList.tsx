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
import { useReactor } from '@dxos/react-client';

import { useSpace } from '../hooks';
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
}> = ({ tasks, onCreate, onDrag }) => {
  const { render } = useReactor();
  const { space } = useSpace();
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    setNewTask(new Task());
  }, []);

  const handleCreateTask = async (task: Task) => {
    if (task.title.length) {
      await space.experimental.db.save(task);
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

  return render(
    <div>
      <DndContext onDragEnd={onDrag ? handleDragEnd : undefined} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={tasks.map((task) => task[id])}>
          <DraggableTaskListContainer tasks={tasks} newTask={newTask} onCreate={handleCreateTask} />
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const DraggableTaskListContainer: FC<{
  tasks: Task[];
  newTask?: Task;
  onCreate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = ({ tasks, newTask, onCreate, onDelete }) => {
  const { render } = useReactor();
  const { active } = useDndContext();

  // TODO(burdon): NewTaskItem doesn't update on create.
  return render(
    <div>
      {tasks.map((task) => (
        <DraggableTaskItem key={task[id]} task={task} onDelete={onDelete} />
      ))}

      {newTask && (
        <div className='flex ml-7' style={active ? { visibility: 'hidden' } : {}}>
          <NewTaskItem task={newTask} onEnter={onCreate} />
        </div>
      )}
    </div>
  );
};

export const DraggableTaskItem: FC<{
  task: Task;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = ({ task, onEnter, onDelete }) => {
  const { render } = useReactor();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task[id] });

  // TODO(burdon): Dragging doesn't handle variable height items?
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return render(
    <div ref={setNodeRef} className='flex flex-1 ml-3' style={style}>
      <div className='pt-1'>
        <button className='w-4' {...listeners} {...attributes}>
          <DotsSixVertical />
        </button>
      </div>

      <TaskItem task={task} onEnter={onEnter} onDelete={onDelete} />
    </div>
  );
};
