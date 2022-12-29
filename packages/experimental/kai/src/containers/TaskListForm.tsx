//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { EchoDatabase } from '@dxos/echo-schema';

import { useSpace } from '../hooks';
import { Task } from '../proto';

//
// TODO(burdon): Soft delete.
// TODO(burdon): Defer callback/render until timeframe.
// TODO(burdon): DB internals.
// TODO(burdon): Sync item creation.
// TODO(burdon): Text model (TextObject, DocumentObject); different decorator.
//

interface Transaction {
  /**
   * Adds mutations to queue.
   * Any uninitialized objects are initialized (replacing "save") when committed.
   */
  update(callback: () => void): void;
  commit(): void;
  cancel(): void;
}

/**
 * Creates implicit branch (cloned objects) to isolate changes to deps until tx is closed (via save/cancel).
 * Async changes to objects outside of scope are not visible.
 */
const useTransaction = (db: EchoDatabase, deps: any[]): Transaction => ({
  update: (callback) => callback(),
  commit: () => {},
  cancel: () => {}
});

export const TaskListForm: FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { database: db } = useSpace();
  const tx = useTransaction(db, [task]);

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
