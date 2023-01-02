//
// Copyright 2022 DXOS.org
//

import { DndContext, useDndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { PlusCircle, XCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { makeReactive, useQuery } from '@dxos/react-client';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, TableRow } from '../components';
import { useOptions, useSpace } from '../hooks';
import { createTask, Task } from '../proto';

/**
 * Sortable task list.
 * https://docs.dndkit.com/presets/sortable
 */
// TODO(burdon): Reuse in Project.
export const TaskList: FC<{ completed?: boolean; readonly?: boolean; title?: string }> = ({
  completed = undefined,
  readonly = false,
  title = 'Tasks'
}) => {
  const { space } = useSpace();
  const tasks = useQuery(space, Task.filter({ completed }));
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    if (!readonly) {
      setNewTask(new Task());
    }
  }, []);

  const handleTestCreate = async () => {
    await createTask(space.experimental.db);
  };

  const handleCreate = async (task: Task) => {
    if (task.title.length) {
      await space.experimental.db.save(task);
      setNewTask(new Task());
    }
  };

  const Menubar = () => (
    <button onClick={handleTestCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  const handleDragEnd = ({ active, over }: any) => {
    // TODO(burdon): Click counts as dragging (disables checkbox/input).
    // TODO(burdon): Check if initially above/below to understand how to swap.
    if (over.id && active?.id !== over.id) {
      console.log('::::', active.id, over.id);
      //   tasks.splice(0, 1, tasks[2]);
      //   console.log(tasks.map((task) => task[id]));
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

  // TODO(burdon): Dragging optional.
  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={tasks.map((task) => task[id])}>
          <TaskItemList tasks={tasks} newTask={newTask} onCreate={handleCreate} />
        </SortableContext>
      </DndContext>
    </Card>
  );
};

export const TaskItemList: FC<{
  tasks: Task[];
  newTask?: Task;
  onCreate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}> = ({ tasks, newTask, onCreate, onDelete }) => {
  const { active } = useDndContext();

  return (
    <div>
      {tasks.map((task) => (
        <DraggableTaskItem key={task[id]} task={task} onDelete={onDelete} />
      ))}

      {!active && newTask && <TaskItem task={newTask} onEnter={onCreate} />}
    </div>
  );
};

const TaskItem: FC<{
  task: Task;
  onDelete?: (task: Task) => void;
  onEnter?: (task: Task) => void;
}> = ({ task, onDelete, onEnter }) => {
  return (
    <TableRow
      sidebar={<div className='flex w-8'></div>}
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onEnter={() => {
            onEnter?.(task);
          }}
          onChange={(value) => {
            task.title = value;
          }}
        />
      }
    />
  );
};

export const DraggableTaskItem = makeReactive<{
  task: Task;
  onDelete?: (task: Task) => void;
  onEnter?: (task: Task) => void;
}>(({ task, onDelete, onEnter }) => {
  const { debug } = useOptions();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task[id] });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={{ cursor: 'drag', ...style }} {...listeners} {...attributes}>
      <TableRow
        sidebar={
          <div className='flex w-8'>
            <input
              type='checkbox'
              spellCheck={false}
              checked={!!task.completed}
              onChange={() => (task.completed = !task.completed)}
            />
          </div>
        }
        action={
          onDelete && (
            <button className='text-gray-300' onClick={() => onDelete(task)}>
              <XCircle className={clsx(getSize(6), 'hover:text-red-400')} />
            </button>
          )
        }
        header={
          <Input
            className='w-full outline-0'
            spellCheck={false}
            value={task.title}
            placeholder='Enter text'
            onEnter={() => {
              onEnter?.(task);
            }}
            onChange={(value) => {
              task.title = value;
            }}
          />
        }
      >
        <div className='ml-8 text-sm text-blue-800'>
          {debug && <div>{PublicKey.from(task[id]).truncate()}</div>}
          <div>{task.assignee?.name}</div>
        </div>
      </TableRow>
    </div>
  );
});
