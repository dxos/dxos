//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ModeOperation } from '#types';

import { AgentOperationError } from './errors.ts';
import { switchChatMode } from './modes.ts';

const handler: Operation.WithHandler<typeof ModeOperation.SwitchMode> = ModeOperation.SwitchMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ chat: chatRef, mode }) {
      const chat = yield* Database.load(chatRef);
      const agent = yield* Agent.loadForChat(chat);
      if (!agent) {
        return yield* Effect.fail(new AgentOperationError({ message: 'The chat does not belong to an agent.' }));
      }

      return yield* switchChatMode(agent, chat, mode);
    }),
  ),
);

export default handler;
