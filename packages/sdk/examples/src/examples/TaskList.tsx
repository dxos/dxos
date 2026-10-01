//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type KeyboardEventHandler, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';

import { TaskType } from '../types.ts';

const TaskList = ({ id, spaceId }: { id: number; spaceId?: SpaceId }) => {
  const space = useSpace(spaceId);
  const tasks = useQuery(space?.db, Filter.type(TaskType));
  const [value, setValue] = useState('');

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setValue(event.currentTarget.value);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && space?.db && value) {
      const task = Obj.make(TaskType, { title: value, completed: false });
      setValue('');
      space?.db.add(task);
    }
  };

  return (
    <div className='grow max-w-lg mt-4 mx-1'>
      <h2 className='mb-2 font-bold'>{`Peer ${id + 1}`}</h2>
      <Next.Field.Root>
        <Next.Field.Label srOnly>Create new item</Next.Field.Label>
        <Next.Input
          classNames='mb-2'
          placeholder='New item'
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </Next.Field.Root>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mb-2 pl-3'>
            <Next.Field.Root>
              <Next.Field.Label srOnly>Complete {task.title}</Next.Field.Label>
              <Next.Checkbox
                checked={!!task.completed}
                onCheckedChange={() =>
                  Obj.update(task, (task) => {
                    task.completed = !task.completed;
                  })
                }
              />
            </Next.Field.Root>
            <div className='grow'>{task.title}</div>
            <Next.Button
              icon='ph--x--regular'
              iconSize='md'
              label={`Delete ${task.title}`}
              iconOnly
              showTooltip={false}
              variant='ghost'
              onClick={() => space?.db?.remove(task)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
