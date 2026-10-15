//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { AgentChannels, AgentEmail, AgentOperation } from '#types';

const handler: Operation.WithHandler<typeof AgentOperation.CreateEmailChannel> = AgentOperation.CreateEmailChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, ...properties }) {
      const agent = yield* Database.load(agentRef);
      const config = AgentEmail.make(properties);
      const channel = yield* Database.add(
        Channel.make({ name: config.handle, backend: { kind: AgentEmail.BACKEND_KIND, config } }),
      );
      yield* AgentChannels.addChannel(agent, channel);
      return { channel: Ref.make(channel) };
    }),
  ),
);

export default handler;
