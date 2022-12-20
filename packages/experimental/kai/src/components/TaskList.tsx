//
// Copyright 2022 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, EchoObject } from '@dxos/echo-db2';
import { useSpace } from '@dxos/react-client';

import { id, flush, useObjects } from '../hooks';

export const TaskList: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const space = useSpace(spaceKey);
  const db = useMemo(() => space && new EchoDatabase(space.database), [space]);
  const tasks = useObjects(db?.select({ type: 'task' }));
  if (!space) {
    return null;
  }

  console.log(tasks);

  const handleCreate = async () => {
    const obj = new EchoObject();
    obj.title = `Title-${Math.random()}`;
    await flush(obj);
  };

  return (
    <div>
      <pre>{space.key.truncate()}</pre>

      <h2>Tasks</h2>
      <div>
        {tasks?.map((task: EchoObject) => (
          <Task key={id(task)} task={task} />
        ))}
      </div>

      <button onClick={handleCreate}>Create</button>
    </div>
  );
};

export const Task: FC<{ task: EchoObject }> = ({ task }) => {
  return (
    <div>
      <input type='checkbox' checked={task.complete} />
      <div>{task.title}</div>
      <div>{task.assignee.name}</div>
    </div>
  );
};
