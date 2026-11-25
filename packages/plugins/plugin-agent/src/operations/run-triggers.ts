//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';

import { BrainSkill } from '#skills';

import { readSource } from './read-source.ts';

const handler: Operation.WithHandler<typeof BrainSkill.RunTriggers> = BrainSkill.RunTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const chat = yield* Agent.currentSession.pipe(Effect.orElseSucceed(() => undefined));
      const agent = chat ? yield* Agent.loadForSession(chat) : undefined;
      // Every turn is read, not only while a watch is waiting: recall answers from these facts too.
      if (!chat || !agent) {
        return { facts: 0, fired: [], undelivered: [] };
      }

      const { facts, fired, undelivered } = yield* readSource(agent, { source: chat });
      return { facts: facts.length, fired, undelivered };
    }),
  ),
);

export default handler;
