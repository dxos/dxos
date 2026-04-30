//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { Discord } from '../types';
import { CreateBot } from './definitions';

const handler: Operation.WithHandler<typeof CreateBot> = CreateBot.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, applicationId }) {
      return yield* Database.add(Discord.make({ name, applicationId }));
    }),
  ),
);

export default handler;
