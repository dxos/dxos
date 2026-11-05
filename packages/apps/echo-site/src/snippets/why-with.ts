//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, type Database, Obj, Type } from '@dxos/echo';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ done: Schema.Boolean }),
) {}

declare const db: Database.Database;

// #region
const finish = (id: string) => {
  const task = db.getObjectById<Task>(id);
  if (task) {
    Obj.update(task, (task) => {
      task.done = true;
    });
  }
};
// #endregion

export { finish };
