//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, id } from '@dxos/echo-db2';

import { useObjects, useSelection } from '../hooks';
import { Contact, Task } from '../proto/tasks';

// declare const TestTask: any;

export const TaskList: FC<{ database: EchoDatabase; spaceKey: PublicKey }> = ({ spaceKey, database: db }) => {
  const tasks = useObjects(db, Task.filter());

  const handleCreate = async () => {
    const contacts = db.query(Contact.filter()).getObjects();
    const contact = contacts[Math.floor(Math.random() * contacts.length)];

    console.log(contacts)

    await db.save(
      new Task({
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
        {tasks.map(task => (
          <TaskItem key={id(task)} task={task} db={db} />
        ))}
      </div>
    </div>
  );
};

export const TaskItem: FC<{ task: Task; db: EchoDatabase }> = ({ task, db }) => {
  useSelection(db, [task, task.assignee]);

  return (
    <div style={{ display: 'flex' }}>
      <input type='checkbox' checked={task.complete} onChange={(e) => (task.complete = !task.complete)} />
      <input value={task.title} onChange={(e) => (task.title = e.target.value)} />
      <div>{task.assignee?.name}</div>
    </div>
  );
};
