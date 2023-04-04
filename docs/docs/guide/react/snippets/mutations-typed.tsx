//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

import { Task } from './schema';

export const App = () => {
  useIdentity({ login: true });
  const [space] = useSpaces();
  const tasks = useQuery<Task>(space, Task.filter());
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            task.completed = true;
          }}
        >
          {task.title} - {task.completed}
        </div>
      ))}
      <button
        name="add"
        onClick={() => {
          const task = new Task({ title: 'buy milk' });
          space?.db.add(task);
        }}
      >
        Add a task
      </button>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
