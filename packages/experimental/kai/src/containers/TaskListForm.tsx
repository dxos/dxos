//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { EchoDatabase } from '@dxos/echo-schema';

import { useSpace } from '../hooks';
import { Task } from '../proto';

/**
 * Mutation batch.
 * Adds mutations to queue.
 * Any uninitialized objects are initialized (replacing "save") when committed.
 */
class Transaction {
  constructor(private readonly _database: EchoDatabase) {}
  wrap(object: any) {
    return object;
  }

  commit() {}
  cancel() {}
}

/**
 * Creates implicit branch (cloned objects) to isolate changes to deps until tx is closed (via save/cancel).
 * Async changes to objects outside of scope are not visible.
 */
const useTransaction = (db: EchoDatabase): Transaction => {
  const [tx, setTx] = useState<Transaction>(new Transaction(db));
  useEffect(() => {
    setTx(new Transaction(db));
  }, []);

  return tx;
};

export const TaskListForm: FC<{ task: Task; onClose: () => void }> = ({ task: currentTask, onClose }) => {
  const { database } = useSpace();
  const tx = useTransaction(database);
  const task = tx.wrap(currentTask); // Projection.

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
      <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
      <input type='text' value={task.title} onChange={(event) => (task.title = event.target.value)} />
      <div>
        <button onClick={() => handleClose(true)}>Save</button>
        <button onClick={() => handleClose(false)}>Cancel</button>
      </div>
    </div>
  );
};
