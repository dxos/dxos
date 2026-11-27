//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { AgentOperation } from '#types';

import { appendToChat, ensureChannelChat } from './ensure-channel-chat.ts';

const handler: Operation.WithHandler<typeof AgentOperation.RecordChannelSend> = AgentOperation.RecordChannelSend.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, channel: channelRef, thread, text, properties }) {
      const agent = yield* Database.load(agentRef);
      const channel = yield* Database.load(channelRef);
      const chat = yield* ensureChannelChat({ agent, channel, thread });
      yield* appendToChat(agent, chat, text, properties);
      return { chat: Ref.make(chat) };
    }),
  ),
);

export default handler;
