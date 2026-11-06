//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Client, Config } from '@dxos/client';
import { Defaults, Local } from '@dxos/config';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { ClientProvider, useClient } from '@dxos/react-client';
import { useObject, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String, completed: Schema.optional(Schema.Boolean) }),
) {}

// #region spaces
const Spaces = () => {
  const client = useClient();
  const spaces = useSpaces();
  return (
    <>
      <ul>
        {spaces.map((space) => (
          <li key={space.id}>{space.id}</li>
        ))}
      </ul>
      <button onClick={() => client.spaces.create()}>New space</button>
    </>
  );
};
// #endregion

// #region row
const TaskRow = ({ task }: { task: Task }) => {
  const [snapshot, update] = useObject(task);
  return (
    <li
      onClick={() =>
        update((task) => {
          task.completed = true;
        })
      }
    >
      {snapshot.title} {snapshot.completed ? '(done)' : ''}
    </li>
  );
};
// #endregion

// #region list
const Tasks = () => {
  // Waits for HALO: the default space exists once an identity does.
  const identity = useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Task));

  if (!identity || !space) {
    return null;
  }

  return (
    <>
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
      <button onClick={() => space.db.add(Obj.make(Task, { title: 'Buy milk' }))}>Add a task</button>
      <button onClick={() => tasks[0] && space.db.remove(tasks[0])}>Remove the first task</button>
    </>
  );
};
// #endregion

// #region provider
const App = () => (
  <ClientProvider types={[Task]}>
    <Tasks />
  </ClientProvider>
);

createRoot(document.getElementById('root')!).render(<App />);
// #endregion

// #region fallback
const Loading = () => <div>Loading…</div>;

const WithFallback = () => (
  <ClientProvider types={[Task]} fallback={Loading}>
    <Tasks />
  </ClientProvider>
);
// #endregion

// #region client
const client = new Client({ types: [Task] });

const WithClient = () => (
  <ClientProvider client={client}>
    <Tasks />
  </ClientProvider>
);
// #endregion

// #region config
const WithConfig = () => (
  <ClientProvider types={[Task]} config={async () => new Config(Local(), Defaults())}>
    <Tasks />
  </ClientProvider>
);
// #endregion

export { Spaces, WithClient, WithConfig, WithFallback };
