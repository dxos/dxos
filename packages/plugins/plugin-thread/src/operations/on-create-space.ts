//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';


import { Operation } from '@dxos/operation';

import { CreateChannel, OnCreateSpace } from './definitions';

export default OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      if (isDefault) {
        return;
      }

      const { object: channel } = yield* Operation.invoke(CreateChannel, {
        name: 'General',
        spaceId: space.id,
      });
      space.db.add(channel);
    }),
  ),
);
