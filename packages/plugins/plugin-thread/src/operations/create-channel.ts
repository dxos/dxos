//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { CreateChannel } from './definitions';

import { Channel } from '../types';

const handler: Operation.WithHandler<typeof CreateChannel> = CreateChannel.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => ({
      object: Channel.make({ name: input.name }),
    })),
  ),
);

export default handler;
