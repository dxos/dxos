//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { Channel } from '@dxos/types';

import { DiscordAdminOperation, DiscordChannel } from '#types';

import { botQuery, callAdminRoute } from './bot.ts';
import { findGuildChannel } from './guild-channel.ts';

/** EDGE reads the new objects from the space, which can trail a local write by a moment. */
const BIND_ATTEMPTS = 5;
const BIND_RETRY = '1 second';

const handler: Operation.WithHandler<typeof DiscordAdminOperation.BindChannel> = DiscordAdminOperation.BindChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      applicationId,
      accessToken,
      agent: agentRef,
      guildId,
      guildName,
      discordChannelId,
    }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const found = yield* findGuildChannel(agent, applicationId, guildId);
      const { channel, config } =
        found ?? (yield* createGuildChannel(agent, { applicationId, accessToken, guildId, guildName }));
      if (!config.channels.includes(discordChannelId)) {
        Obj.update(config, (config) => {
          config.channels = [...config.channels, discordChannelId];
        });
      }
      yield* Database.flush();

      const { spaceId } = yield* botQuery();
      yield* callAdminRoute(
        applicationId,
        `/bindings/${encodeURIComponent(discordChannelId)}`,
        {
          method: 'PUT',
          body: {
            spaceId,
            guildId,
            binding: EID.make({ spaceId, entityId: config.id }),
            channel: EID.make({ spaceId, entityId: channel.id }),
          },
        },
        Schema.Unknown,
      ).pipe(
        Effect.retry({
          times: BIND_ATTEMPTS - 1,
          schedule: Schedule.spaced(BIND_RETRY),
          while: (error) => /not found/i.test(error.message),
        }),
        Effect.orDie,
      );
      return { channel: Ref.make(channel) };
    }),
  ),
);

export default handler;

/** The agent's Discord `Channel` for one guild: a new config naming the bot, added to the agent's channels. */
const createGuildChannel = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  {
    applicationId,
    accessToken,
    guildId,
    guildName,
  }: {
    applicationId: string;
    accessToken: DiscordChannel.Properties['accessToken'];
    guildId: string;
    guildName?: string;
  },
) {
  const config = DiscordChannel.make({ accessToken, applicationId, guildId, channels: [] });
  const channel = yield* Database.add(
    Channel.make({ name: guildName ?? 'Discord', backend: { kind: DiscordChannel.BACKEND_KIND, config } }),
  );
  const list = yield* AgentChannels.loadForAgent(agent);
  if (list) {
    Obj.update(list, (list) => {
      list.channels = [...list.channels, Ref.make(channel)];
    });
  } else {
    yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
  }
  return { channel, config };
});
