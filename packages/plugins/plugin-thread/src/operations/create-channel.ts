//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';

import { Operation } from '@dxos/operation';

import { CreateChannel } from './definitions';

import { Channel } from '../types';

export default CreateChannel.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => ({
      object: Channel.make({ name: input.name }),
    })),
  ),
);
