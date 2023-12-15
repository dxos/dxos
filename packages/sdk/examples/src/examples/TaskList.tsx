//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type KeyboardEventHandler, useState } from 'react';

import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { Button, Input } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

// TODO(wittjosiah): Why doesn't Stackblitz understand import of just proto directory?
import { Task } from '../proto/gen/schema';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Task.filter());
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && space && inputValue) {
      const task = new Task({ title: inputValue });
      setInputValue('');
      space.db.add(task);
    }
  };

  return (
    <div className='grow max-w-lg mbs-4 place-content-evenly'>
      <h2 className='mbe-2 font-bold'>{`Peer ${id + 1}`}</h2>
      <Input.Root>
        <Input.Label srOnly>Create new item</Input.Label>
        <Input.TextInput
          value={inputValue}
          onChange={({ target: { value } }) => setInputValue(value)}
          classNames='mbe-2'
          placeholder='New item'
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mbe-2 pl-3'>
            <Input.Root>
              <Input.Label srOnly>Complete {task.title}</Input.Label>
              <Input.Checkbox checked={task.completed} onCheckedChange={() => (task.completed = !task.completed)} />
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
