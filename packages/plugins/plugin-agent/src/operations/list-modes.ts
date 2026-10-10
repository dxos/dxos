//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Mode, ModeOperation } from '#types';

import { AgentOperationError } from './errors.ts';
import { ensureModes, skillKeyOf } from './modes.ts';

const handler: Operation.WithHandler<typeof ModeOperation.ListModes> = ModeOperation.ListModes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ chat: chatRef }) {
      const chat = yield* Database.load(chatRef);
      const agent = yield* Agent.loadForChat(chat);
      if (!agent) {
        return yield* Effect.fail(new AgentOperationError({ message: 'The chat does not belong to an agent.' }));
      }

      const current = Mode.getCurrent(chat);
      const modes = yield* ensureModes(agent);
      return {
        current,
        modes: modes.map((mode) => ({
          name: mode.name,
          description: mode.description,
          skills: mode.skills.map(skillKeyOf).filter((key) => key !== undefined),
          records: mode.records ? [...mode.records] : undefined,
          current: mode.name === current,
        })),
      };
    }),
  ),
);

export default handler;
