//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type KeyboardEventHandler, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { Field, IconButton } from '@dxos/react-ui';

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
      <Field.Root>
        <Field.Label srOnly>Create new item</Field.Label>
        <Field.Input
          classNames='mb-2'
          placeholder='New item'
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </Field.Root>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mb-2 pl-3'>
            <Field.Root>
              <Field.Label srOnly>Complete {task.title}</Field.Label>
              <Field.Checkbox
                checked={!!task.completed}
                onCheckedChange={() =>
                  Obj.update(task, (task) => {
                    task.completed = !task.completed;
                  })
                }
              />
            </Field.Root>
            <div className='grow'>{task.title}</div>
            <IconButton
              icon='ph--x--regular'
              size={4}
              label={`Delete ${task.title}`}
              iconOnly
              noTooltip
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
