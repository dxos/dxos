//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { makeReactive, useQuery } from '@dxos/react-client';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, Table } from '../components';
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

  const handleCreate = async () => {
    await createTask(space.experimental.db);
  };

  const handleNewTask = async (task: Task) => {
    if (task.title.length) {
      await space.experimental.db.save(task);
      setNewTask(new Task());
    }
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  const handleDragEnd = ({ active, over }: any) => {
    // TODO(burdon): Check if initially above/below to understand how to swap.
    console.log('::::', active.id, over.id);
    tasks.splice(0, 1, tasks[2]);
    console.log(tasks.map((task) => task[id]));
  };

  // TODO(burdon): Delete row.
  // TODO(burdon): Ordered list (linked list?)
  // TODO(burdon): Split current task if pressing Enter in the middle.
  // TODO(burdon): Delete key to potentially remove task.
  // TODO(burdon): Tab to indent.
  // TODO(burdon): Track index position; move up/down.
  // TODO(burdon): Scroll into view.
  // TODO(burdon): Highlight active row.

  // TODO(burdon): Check editable.
  // TODO(burdon): DragOverlay

  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <div className='p-3'>
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((task) => task[id])}>
            {tasks.map((task) => (
              <TaskItem key={task[id]} task={task} />
            ))}
          </SortableContext>
        </DndContext>

        {newTask && <TaskItem task={newTask} onEnter={handleNewTask} />}
      </div>
    </Card>
  );
};

export const TaskItem = makeReactive<{ task: Task; onEnter?: (task: Task) => void }>(({ task, onEnter }) => {
  const { debug } = useOptions();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task[id] });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={{ cursor: 'drag', ...style }} {...listeners} {...attributes}>
      <Table
        sidebar={
          <input
            type='checkbox'
            spellCheck={false}
            checked={!!task.completed}
            onChange={() => (task.completed = !task.completed)}
          />
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
        <div className='text-sm text-blue-800'>
          {debug && <div>{PublicKey.from(task[id]).truncate()}</div>}
          <div>{task.assignee?.name}</div>
        </div>
      </Table>
    </div>
  );
});
