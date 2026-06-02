//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { FeedOperation } from '../types';

const handler: Operation.WithHandler<typeof FeedOperation.OnCreateSpace> = FeedOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      // TODO(wittjosiah): Remove once function registry is available.
      space.db.add(Operation.serialize(FeedOperation.SyncFeed));
    }),
  ),
);

export default handler;
