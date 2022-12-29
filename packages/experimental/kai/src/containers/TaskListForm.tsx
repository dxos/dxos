//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { EchoDatabase, EchoObject } from '@dxos/echo-schema';

import { useSpace } from '../hooks';
import { Task } from '../proto';

//
// TODO(burdon): Soft delete.
// TODO(burdon): Defer callback/render until timeframe.
// TODO(burdon): DB internals.
// TODO(burdon): Sync item creation.
// TODO(burdon): Text model (TextObject, DocumentObject); different decorator.
//

/**
 * Mutation batch.
 * Adds mutations to queue.
 * Any uninitialized objects are initialized (replacing "save") when committed.
 */
class Transaction {
  constructor(private readonly _database: EchoDatabase) {}
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

/**
 * Clone objects scoped by transaction.
 * Pass in existing items or database query.
 */
const useObjects = (tx: Transaction, query: any): EchoObject[] => {
  return [{} as EchoObject];
};

export const TaskListForm: FC<{ task: Task; onClose: () => void }> = ({ task: currentTask, onClose }) => {
  const { database } = useSpace();
  const tx = useTransaction(database);
  const [task] = useObjects(tx, [currentTask]); // TODO(burdon): Ugly.

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
