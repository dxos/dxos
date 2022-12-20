//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, EchoObject } from '@dxos/echo-db2';

import { id, useObjects, useSelection } from '../hooks';

export const TaskList: FC<{ database: EchoDatabase; spaceKey: PublicKey }> = ({ spaceKey, database: db }) => {
  const tasks = useObjects(db, { type: 'kai:task' });

  const handleCreate = async () => {
    await db.save(
      new EchoObject({
        type: 'kai:task',
        title: `Title-${Math.random()}`
      })
    );
  };

  return (
    <div>
      <pre>{spaceKey.truncate()}</pre>

      <h2>Tasks</h2>
      <div>
        {tasks?.map((task: EchoObject) => (
          <Task key={id(task)} task={task} db={db} />
        ))}
      </div>

      <button onClick={handleCreate}>Create</button>
    </div>
  );
};

export const Task: FC<{ task: EchoObject; db: EchoDatabase }> = ({ task, db }) => {
  useSelection(db, task);

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <input type='checkbox' checked={task.complete} onChange={(e) => (task.complete = !!e.target.value)} />
      <input value={task.title} onChange={(e) => (task.title = e.target.value)} />
    </div>
  );
};
