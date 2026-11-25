//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';

import { ThreadDelegate } from './definitions.ts';

const handler: Operation.WithHandler<typeof ThreadDelegate> = ThreadDelegate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ task, purpose }) {
      const { thread } = yield* Agent.delegate({
        target: { kind: 'thread' },
        message: [{ _tag: 'text', text: task }],
        purpose,
      }).pipe(Effect.orDie);
      return `Started subagent thread ${thread} ("${purpose}"). It runs in the background; call thread-wait with thread "${thread}" when you need its answer.`;
    }),
  ),
);

export default handler;
