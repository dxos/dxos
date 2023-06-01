//
// Copyright 2023 DXOS.org
//

import React, { KeyboardEventHandler, useState } from 'react';

import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';

import { Task } from '../../proto';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      space?.db.add(task);
    }
  };

  const inputId = `createTaskInput--${id}`;

  return (
    <div className='task-list'>
      <p role='heading'>{`Peer ${id + 1}`}</p>
      <input
        aria-label='Create new item'
        placeholder='New item'
        id={inputId}
        ref={(e: HTMLInputElement) => setInput(e)}
        onKeyDown={handleKeyDown}
      />
      <div role='list'>
        {tasks.map((task) => (
          <div role='listitem' key={task.id}>
            <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
            <p>{task.title}</p>
            <button onClick={() => space?.db.remove(task)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
