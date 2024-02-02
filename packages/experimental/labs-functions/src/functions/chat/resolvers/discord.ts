//
// Copyright 2024 DXOS.org
//

import { Client as DiscordClient, IntentsBitField, SnowflakeUtil, type TextChannel } from 'discord.js';

import { Event } from '@dxos/async';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { type ResolverMap } from './type';

export const createResolver = async (config: Config): Promise<ResolverMap> => {
  const { value: token } = config.find('runtime.keys', { name: 'discord.com/token' }) ?? {};
  const { value: channelId } = config.find('runtime.keys', { name: 'discord.com/channel' }) ?? {};
  if (!token) {
    throw new Error('Missing token.');
  }

  // https://github.com/discordjs/discord.js
  // GPT Demo: https://youtu.be/CB76_GDrPsE?si=M97FHRxPe8SGZtkS
  const client = new DiscordClient({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
  });

  const readyPromise = Event.wrap(client, 'ready').waitForCount(1);
  await client.login(token);
  await readyPromise;

  return {
    messages: {
      recent: async () => {
        const after = SnowflakeUtil.generate({
          timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3 /* days */,
        }).toString();

        const channel = (await client.channels.fetch(channelId)) as TextChannel;
        const allChannels = await channel.guild.channels.fetch();
        const messages = (
          await Promise.all(
            allChannels.map(async (channel) => {
              if (!channel?.isTextBased()) {
                return '';
              }

              try {
                const results = await channel.messages.fetch({ after, limit: 100 });

                const messages = results
                  .filter((msg) => msg.content.trim().length > 0)
                  .map(
                    (msg) => `${new Date(msg.createdTimestamp).toISOString()} @${msg.author.username}: ${msg.content}`,
                  );

                return ['Messages:', messages].join('\n');
              } catch (err: any) {
                log.error('processing channel', err);
                return '';
              }
            }),
          )
        ).flat();

        return messages.join('\n');
      },
    },
  };
};
