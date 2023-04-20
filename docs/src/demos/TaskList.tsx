//
// Copyright 2022 DXOS.org
//

import React, { KeyboardEventHandler, useState } from 'react';

import type { Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';

import { Task } from './proto';

const TaskList = ({ space, clientIndex }: { space: Space; clientIndex: number }) => {
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      await space.db.add(task);
    }
  };

  const inputId = `createTaskInput--${clientIndex}`;

  return (
    <div className='task-list'>
      <h2 style={{ display: 'block', marginBlock: '0 0.5rem', fontSize: 'inherit' }}>{`Client ${clientIndex + 1}`}</h2>
      <input
        aria-label='Create new item'
        placeholder='New item'
        style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
        id={inputId}
        ref={(e: HTMLInputElement) => setInput(e)}
        onKeyDown={handleKeyDown}
      />
      <div role='list'>
        {tasks.map((task) => (
          <div
            role='listitem'
            key={task.id}
            style={{ display: 'flex', alignItems: 'center', marginBlock: '.5rem', gap: '.5rem' }}
          >
            <input
              type='checkbox'
              checked={!!task.completed}
              onChange={() => (task.completed = !task.completed)}
              style={{ flex: '0 0 auto' }}
            />
            <p style={{ flex: '1 0 0', minWidth: '0', marginBlock: '0.25rem' }}>{task.title}</p>
            <button
              style={{ flex: '0 0 auto', height: '1.2rem', width: '1.2rem', padding: '0' }}
              onClick={() => space.db.remove(task)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
