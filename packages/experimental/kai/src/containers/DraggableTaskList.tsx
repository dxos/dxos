//
// Copyright 2022 DXOS.org
//

import { DndContext, useDndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from 'phosphor-react';
import React, { useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { makeReactive } from '@dxos/react-client';

import { useSpace } from '../hooks';
import { Task } from '../proto';
import { TaskItem, NewTaskItem } from './TaskList';

/**
 * Sortable task list.
 * https://docs.dndkit.com/presets/sortable
 */
export const DraggableTaskList = makeReactive<{ tasks: Task[]; onCreate?: (task: Task) => void }>(
  ({ tasks, onCreate }) => {
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
      // TODO(burdon): Click counts as dragging (disables checkbox/input).
      // TODO(burdon): Check if initially above/below to understand how to swap.
      if (over && active.data.current.supports.includes(over.data.current.type)) {
        console.log('::::', active.id, over.id);
        // tasks.splice(0, 1, tasks[2]);
        // console.log(tasks.map((task) => task[id]));
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
        <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={tasks.map((task) => task[id])}>
            <DraggableTaskListContainer tasks={tasks} newTask={newTask} onCreate={handleCreateTask} />
          </SortableContext>
        </DndContext>
      </div>
    );
  }
);

export const DraggableTaskListContainer = makeReactive<{
  tasks: Task[];
  newTask?: Task;
  onCreate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}>(({ tasks, newTask, onCreate, onDelete }) => {
  const { active } = useDndContext();

  // TODO(burdon): NewTaskItem doesn't update on create.
  return (
    <div>
      {tasks.map((task) => (
        <DraggableTaskItem key={task[id]} task={task} onDelete={onDelete} />
      ))}

      {newTask && (
        <div className='flex mt-2 ml-7' style={active ? { visibility: 'hidden' } : {}}>
          <NewTaskItem task={newTask} onEnter={onCreate} />
        </div>
      )}
    </div>
  );
});

export const DraggableTaskItem = makeReactive<{
  task: Task;
  onEnter?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}>(({ task, onEnter, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task[id] });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} className='flex flex-1 ml-3 items-center' style={style}>
      <button className='w-4' {...listeners} {...attributes}>
        <DotsSixVertical />
      </button>
      <TaskItem task={task} onEnter={onEnter} onDelete={onDelete} />
    </div>
  );
});
