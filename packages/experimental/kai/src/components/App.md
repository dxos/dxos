//
// Copyright 2022 DXOS.org
//

import React, { FC, Suspense, useEffect, useMemo, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { EchoDatabase, EchoObject } from '@dxos/echo-db2';
import { ClientProvider, useSpace } from '@dxos/react-client';

const id = (object: EchoObject) => object._id;

const unique = (object: EchoObject) => true;

const useSelection = (selection: any) => {
  return [];
};

const List: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const space = useSpace(spaceKey);
  const db = useMemo(() => space && new EchoDatabase(space.database), [space]);
  if (!space) {
    return null;
  }

  // const tasks = useSelection({ type: 'task' }).update((task: any) => task.assignee);
  const tasks = useSelection({ type: 'task' }, [task => task.assignee, task => task.title]);


  const tasks = useObjects({ type: 'task' })
  useUpdates(tasks.map(task => task.assignee))


  // TODO(burdon): Not updated.
  const handleCreate = async () => {
    const obj = new EchoObject();
    obj.title = `Title-${Math.random()}`;
    await db?.save(obj);
  };

  console.log('Objects', db?.objects);

  return (
    <div>
      <pre>{space.key.truncate()}</pre>

      <h2>Tasks</h2>
      <div>
        {tasks.map((task: EchoObject) => (
          <Task key={id(task)} task={task} />
        ))}
      </div>

      <h2>People</h2>
      <div>
        {tasks
          .map((task: any) => task.assignee)
          .filter(unique)
          .map((person) => (
            <Person key={id(person)} person={person} />
          ))}
      </div>

      <button onClick={handleCreate}>Create</button>
    </div>
  );
};

export const Task: FC<{ task: EchoObject }> = ({ task }) => {
  return (
    <div>
      <div>{task.title}</div>
      <div>{task.assignee.name}</div>
    </div>
  );
};

// const TestQuery = (task: EchoObject) => ({ title: task.title, name: task.assignee.name });

export const Task: FC<{ task: EchoObject }> = ({ task }) => {
  useSelection(task);
  useSelection([task.assignee, task.manager]);
  useSelection(() => task.assignee);
  // const reactiveTask = useSelection(task, [task.assignee, task.manager]);

  return (
    <div>
      <div>{task.title}</div>
      <div>{task.assignee.name}</div>
      <div>{task.manager.name}</div>
    </div>
  );
// };

// const person = generate(Person);

export const Person: FC<{ person: EchoObject }> = ({ person }) => {
  // useSelection(() => person.name);
  useUpdates(person);

  // useUpdates when you want to get updates.
  // To make the component reactive useSelection to define the data.

  return (
    <div>
      <input
        value={person.name}
        onChange={(e) => {
          person.name = e.target.value;
        }}
      />
    </div>
  );
};

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({
        services: fromHost()
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
      await client.halo.createProfile();
      const space = await client.echo.createSpace();

      setClient(client);
      setSpaceKey(space.key);
    });
  }, []);

  if (!client || !spaceKey) {
    return null;
  }

  return (
    <div>
      <ClientProvider client={client}>
        <div>
          <h1>Kai</h1>
          <List spaceKey={spaceKey} />
        </div>
      </ClientProvider>
    </div>
  );
};
