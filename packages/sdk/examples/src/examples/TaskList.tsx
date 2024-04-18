//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type KeyboardEventHandler, useState, type ChangeEventHandler } from 'react';

import type { PublicKey } from '@dxos/client';
import { Filter, create } from '@dxos/echo-schema';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { Button, Input } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { TaskType } from '../types';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Filter.schema(TaskType));
  const [value, setValue] = useState('');

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setValue(event.currentTarget.value);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && space && value) {
      const task = create(TaskType, { title: value, completed: false });
      setValue('');
      space.db.add(task);
    }
  };

  return (
    <div className='grow max-w-lg mbs-4 mx-1'>
      <h2 className='mbe-2 font-bold'>{`Peer ${id + 1}`}</h2>
      <Input.Root>
        <Input.Label srOnly>Create new item</Input.Label>
        <Input.TextInput
          classNames='mbe-2'
          placeholder='New item'
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mbe-2 pl-3'>
            <Input.Root>
              <Input.Label srOnly>Complete {task.title}</Input.Label>
              <Input.Checkbox checked={!!task.completed} onCheckedChange={() => (task.completed = !task.completed)} />
            </Input.Root>
            <div className='grow'>{task.title}</div>
            <Button variant='ghost' onClick={() => space?.db.remove(task)}>
              <X className={getSize(4)} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
