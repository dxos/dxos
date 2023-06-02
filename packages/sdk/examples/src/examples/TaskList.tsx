//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { KeyboardEventHandler, useState } from 'react';

import { TextInput, Button, Checkbox, InputRoot, Label } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';

import { Task } from '../proto';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && space && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      space.db.add(task);
    }
  };

  return (
    <div className='grow max-w-lg mbs-4 place-content-evenly'>
      <h2 className='mbe-2 font-bold'>{`Peer ${id + 1}`}</h2>
      <InputRoot>
        <Label srOnly>Create new item</Label>
        <TextInput
          classNames='mbe-2'
          placeholder='New item'
          ref={(e: HTMLInputElement) => setInput(e)}
          onKeyDown={handleKeyDown}
        />
      </InputRoot>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mbe-2 pl-3'>
            <InputRoot>
              <Label srOnly>Complete {task.title}</Label>
              <Checkbox checked={!!task.completed} onCheckedChange={() => (task.completed = !task.completed)} />
            </InputRoot>
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
