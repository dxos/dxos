//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { EchoDatabase, EchoObject } from '@dxos/echo-schema';

import { useSpace } from '../hooks';

//
// TODO(burdon): Soft delete.
// TODO(burdon): Defer callback/render until timeframe.
// TODO(burdon): DB internals.
// TODO(burdon): Sync item creation.
// TODO(burdon): Text model (TextObject, DocumentObject); different decorator.
//

/**
 * Mutation batch.
 */
class Transaction {
  constructor(private readonly _database: EchoDatabase) {}

  get db() {
    return this._database;
  }

  /**
   * Adds mutations to queue.
   * Any uninitialized objects are initialized (replacing "save") when committed.
   */
  update(callback: () => void) {}

  /**
   * Commit clones to db.
   */
  commit() {}

  /**
   * Dispose of clones.
   */
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
 * Clone objects.
 */
// TODO(burdon): Ugly.
const useObjects = (tx: Transaction, id: string): EchoObject[] => {
  return [{} as EchoObject];
};

export const TaskListForm: FC<{ taskId: string; onClose: () => void }> = ({ taskId, onClose }) => {
  const { database: db } = useSpace();
  const tx = useTransaction(db);

  // TODO(burdon): Needs to be a scoped object.
  const [task] = useObjects(tx, taskId);

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
        value={task.title}
        placeholder='Enter text'
        onChange={(event) => tx.update(() => (task.title = event.target.value))}
      />
      <div>
        <button onClick={() => handleClose(true)}>Save</button>
        <button onClick={() => handleClose(false)}>Cancel</button>
      </div>
    </div>
  );
};
