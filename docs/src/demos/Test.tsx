//
// Copyright 2022 DXOS.org
//

import React, { KeyboardEventHandler, useState } from 'react';

import type { Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';

import { Task } from '../proto';

const TaskList = ({ space }: { space: Space }) => {
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      await space.db.add(task);
    }
  };

  return (
    <div>
      <input ref={(e: HTMLInputElement) => setInput(e)} onKeyDown={handleKeyDown} />
      {tasks.map((task) => (
        <div key={task.id}>
          <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
          {task.title}
          <button onClick={() => space.db.remove(task)}>x</button>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
