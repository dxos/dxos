//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.OnCreateSpace> = ThreadOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      if (isDefault) {
        return;
      }

      const { object: channel } = yield* Operation.invoke(ThreadOperation.CreateChannel, {
        name: 'General',
        spaceId: space.id,
      });
      space.db.add(channel);
    }),
  ),
);

export default handler;
