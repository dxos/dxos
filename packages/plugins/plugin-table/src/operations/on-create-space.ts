// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { Task } from '@dxos/types';

import { OnCreateSpace, Create } from './definitions';

const handler: Operation.WithHandler<typeof OnCreateSpace> = OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      const { object } = yield* Operation.invoke(Create, {
        db: space.db,
        typename: Task.Task.typename,
      });
      space.db.add(object);
    }),
  ),
);

export default handler;
