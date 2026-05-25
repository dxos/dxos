//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Channel } from '@dxos/types';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateChannel> = ThreadOperation.CreateChannel.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => ({
      object: Channel.make({ name: input.name }),
    })),
  ),
);

export default handler;
