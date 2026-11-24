//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Trajectory from '@dxos/compute/Trajectory';

import { ThreadWait } from './definitions.ts';

const handler: Operation.WithHandler<typeof ThreadWait> = ThreadWait.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ thread }) {
      return yield* Option.match(Schema.decodeUnknownOption(Trajectory.ThreadId)(thread), {
        onNone: () => Effect.succeed(`There is no thread ${thread}.`),
        onSome: (id) => Agent.waitForThread(id).pipe(Effect.orDie),
      });
    }),
  ),
);

export default handler;
