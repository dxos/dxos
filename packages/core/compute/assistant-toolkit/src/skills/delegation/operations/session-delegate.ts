//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';

import { SessionDelegate } from './definitions.ts';

const handler: Operation.WithHandler<typeof SessionDelegate> = SessionDelegate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ task, purpose }) {
      const { session } = yield* Agent.delegate({ target: { kind: 'session' }, task, purpose }).pipe(Effect.orDie);
      return `Started session ${session} ("${purpose}"). It works the task on its own and marks it done; there is nothing to wait for.`;
    }),
  ),
);

export default handler;
