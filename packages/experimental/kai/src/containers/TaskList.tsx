//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { EchoDatabase, id } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { getSize } from '@dxos/react-uikit';

import { Card, Input, Table } from '../components';
import { useQuery, useSubscription, useSpace, useOptions } from '../hooks';
import { createTask, Task } from '../proto';

//
// TODO(burdon): Soft delete.
// TODO(burdon): Defer callback/render until timeframe.
// TODO(burdon): DB internals.
// TODO(burdon): Sync item creation.
// TODO(burdon): Text model (TextObject, DocumentObject); different decorator.
//

interface Transaction {
  update(callback: () => void): void;
  commit(): void;
  cancel(): void;
}

const useTransaction = (db: EchoDatabase): Transaction => ({
  update: (callback) => callback(),
  commit: () => {},
  cancel: () => {}
});

const TaskForm: FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { database: db } = useSpace();
  const tx = useTransaction(db);

  const handleClose = (commit: boolean) => {
    if (commit) {
      tx.commit();
    } else {
      tx.cancel();
    }

    onClose();
  };

  return (
    <div>
      <input
        type='checkbox'
        checked={!!task.completed}
        onChange={() => tx.update(() => (task.completed = !task.completed))}
      />
      <input
        type='text'
        spellCheck={false}
        value={task.title}
        placeholder='Enter text'
        onChange={(event) => tx.update(() => (task.title = event.target.value))}
      />
      <div>
        <button onClick={() => handleClose(true)}>save</button>
        <button onClick={() => handleClose(false)}>cancel</button>
      </div>
    </div>
  );
};

//
//
//

export const TaskList: FC<{ completed?: boolean; readonly?: boolean; title?: string }> = ({
  completed = undefined,
  readonly = false,
  title = 'Tasks'
}) => {
  const { database: db } = useSpace();
  const tasks = useQuery(db, Task.filter({ completed }));
  const [newTask, setNewTask] = useState<Task>();
  useEffect(() => {
    if (!readonly) {
      setNewTask(new Task());
    }
  }, []);

  const handleCreate = async () => {
    await createTask(db);
  };

  const handleNewTask = async (task: Task) => {
    if (task.title.length) {
      await db.save(task);
      setNewTask(new Task());
    }
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  // TODO(burdon): Delete row.
  // TODO(burdon): Ordered list (linked list?)
  // TODO(burdon): Split current task if pressing Enter in the middle.
  // TODO(burdon): Delete key to potentially remove task.
  // TODO(burdon): Tab to indent.
  // TODO(burdon): Track index position; move up/down.
  // TODO(burdon): Scroll into view.
  // TODO(burdon): Highlight active row.
  return (
    <Card title={title} className='bg-teal-400' menubar={!readonly && <Menubar />}>
      <div className='p-3'>
        {tasks.map((task) => (
          <TaskItem key={task[id]} task={task} />
        ))}

        {newTask && <TaskItem task={newTask} onEnter={handleNewTask} />}
      </div>
    </Card>
  );
};

export const TaskItem: FC<{ task: Task; onEnter?: (task: Task) => void }> = ({ task, onEnter }) => {
  const { database: db } = useSpace();
  const { debug } = useOptions();
  useSubscription(db, [task, task.assignee]);

  return (
    <Table
      sidebar={
        <input
          type='checkbox'
          spellCheck={false}
          checked={!!task.completed}
          onChange={() => (task.completed = !task.completed)}
        />
      }
      header={
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={task.title}
          placeholder='Enter text'
          onEnter={() => {
            onEnter?.(task);
          }}
          onChange={(value) => {
            task.title = value;
          }}
        />
      }
    >
      <div className='text-sm text-blue-800'>
        {debug && <div>{PublicKey.from(task[id]).truncate()}</div>}
        <div>{task.assignee?.name}</div>
      </div>
    </Table>
  );
};
