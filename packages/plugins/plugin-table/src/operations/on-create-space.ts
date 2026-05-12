// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Task } from '@dxos/types';

import { TableOperation } from '../types';

const handler: Operation.WithHandler<typeof TableOperation.OnCreateSpace> = TableOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      const { object } = yield* Operation.invoke(TableOperation.Create, {
        db: space.db,
        typename: Task.Task.typename,
      });
      space.db.add(object);
    }),
  ),
);

export default handler;
