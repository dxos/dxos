//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, EchoObject } from '@dxos/echo-db2';

import { id, useObjects, useSelection } from '../hooks';

// declare const TestTask: any;

export const TaskList: FC<{ database: EchoDatabase; spaceKey: PublicKey }> = ({ spaceKey, database: db }) => {
  // const tasks = useObjects(db, TestTask.filter({ completed: true }));
  const tasks = useObjects(db, { type: 'task' });

  const handleCreate = async () => {
    const contacts = db.query({ type: 'person' }).getObjects();
    const contact = contacts.length && contacts[Math.floor(Math.random() * contacts.length)];

    await db.save(
      new EchoObject({
        // '@type': 'dxos.example.kai.TestTask',
        type: 'task',
        title: `Title-${Math.random()}`,
        assignee: contact
      })
    );
  };

  return (
    <div>
      <div>
        <h2>Tasks</h2>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div>
        {tasks?.map((task: EchoObject) => (
          <Task key={id(task)} task={task} db={db} />
        ))}
      </div>
    </div>
  );
};

export const Task: FC<{ task: EchoObject; db: EchoDatabase }> = ({ task, db }) => {
  useSelection(db, [task, task.assignee]);

  return (
    <div style={{ display: 'flex' }}>
      <input type='checkbox' value={task.complete} onChange={(e) => (task.complete = !task.complete)} />
      <input value={task.title} onChange={(e) => (task.title = e.target.value)} />
      <div>{task.assignee.name}</div>
    </div>
  );
};
