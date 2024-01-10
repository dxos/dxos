import { Client as DiscordClient, IntentsBitField, SnowflakeUtil, type TextChannel } from 'discord.js';
import { Config } from '@dxos/config';
import { Event, Trigger } from '@dxos/async';

export type ResolverFn = () => Promise<any>;
export type Resolvers = {
  [key: string]: ResolverFn | Resolvers;
};

export const createResolvers = async (config: Config): Promise<Resolvers> => {
  const { value: token } = config.find('runtime.keys', { name: 'discord.com/token' }) ?? {};
  const { value: channelId } = config.find('runtime.keys', { name: 'discord.com/channel' }) ?? {};

  // https://github.com/discordjs/discord.js
  // GPT Demo: https://youtu.be/CB76_GDrPsE?si=M97FHRxPe8SGZtkS
  const client = new DiscordClient({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
  });

  const readyPromise = Event.wrap(client, 'ready').waitForCount(1)
  await client.login(token);
  await readyPromise;

  return {
    discord: {
      messages: {
        recent: async () => {
          if (!token) {
            throw new Error('Missing token.');
          }

          const LAST_WEEK_SNOWFLAKE = SnowflakeUtil.generate({
            timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3 /* days */,
          }).toString();

          const channel = (await client.channels.fetch(channelId)) as TextChannel;
          const allChannels = await channel.guild.channels.fetch();
          const messages = (
            await Promise.all(
              allChannels.map(async (channel) => {
                try {
                  if (!channel?.isTextBased()) {
                    return '';
                  }
                  const res = await channel.messages.fetch({ after: LAST_WEEK_SNOWFLAKE, limit: 100 });
                  const messagesConcatenated = res
                    .filter((msg) => msg.content.trim().length > 0)
                    .map(
                      (msg) => `${new Date(msg.createdTimestamp).toISOString()} @${msg.author.username}: ${msg.content}`,
                    )
                    .join('\n');
                  if (messagesConcatenated.length === 0) {
                    return '';
                  }

                  return `CONVERSATION:\n${messagesConcatenated}\n`;
                } catch (err: any) {
                  console.log(`${channel?.name} ${err.message}`);
                  return '';
                }
              }),
            )
          ).flat();

          return messages.join('');
        },
      },
    },
  };
};
