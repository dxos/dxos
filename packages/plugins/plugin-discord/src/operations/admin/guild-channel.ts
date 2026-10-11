//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import { Database } from '@dxos/echo';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { type Channel } from '@dxos/types';

import { DiscordChannel } from '#types';

/** The agent's Discord `Channel` for one bot and guild, with its config, if the agent has one. */
export const findGuildChannel = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  applicationId: string,
  guildId: string,
) {
  const channels = yield* AgentChannels.loadChannels(agent);
  for (const channel of channels) {
    if (channel.backend.kind !== DiscordChannel.BACKEND_KIND) {
      continue;
    }
    const config = yield* Database.load(channel.backend.config).pipe(Effect.orDie);
    if (DiscordChannel.instanceOf(config) && config.applicationId === applicationId && config.guildId === guildId) {
      return { channel, config } satisfies { channel: Channel.Channel; config: DiscordChannel.DiscordChannel };
    }
  }
  return undefined;
});
