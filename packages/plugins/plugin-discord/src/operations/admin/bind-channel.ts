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
import { findDiscordChannel } from './guild-channel.ts';

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
      discordChannelId,
      channelName,
    }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const { channel, config } =
        (yield* findDiscordChannel(agent, applicationId, discordChannelId)) ??
        (yield* createDiscordChannel(agent, { applicationId, accessToken, guildId, discordChannelId, channelName }));
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

/**
 * The agent's `Channel` for one Discord channel, named after it so the agent's channel list reads as Discord does: a
 * config naming the bot and that channel, added to the agent's channels.
 */
const createDiscordChannel = Effect.fnUntraced(function* (
  agent: Agent.Agent,
  {
    applicationId,
    accessToken,
    guildId,
    discordChannelId,
    channelName,
  }: {
    applicationId: string;
    accessToken: DiscordChannel.Properties['accessToken'];
    guildId: string;
    discordChannelId: string;
    channelName?: string;
  },
) {
  const config = DiscordChannel.make({ accessToken, applicationId, guildId, channels: [discordChannelId] });
  const channel = yield* Database.add(
    Channel.make({ name: channelName ?? discordChannelId, backend: { kind: DiscordChannel.BACKEND_KIND, config } }),
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
