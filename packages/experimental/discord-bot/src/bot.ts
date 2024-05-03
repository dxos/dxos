//
// Copyright 2023 DXOS.org
//

import { Client, IntentsBitField, SnowflakeUtil, type TextChannel } from 'discord.js';

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

export class DiscordBot {
  constructor(private readonly _config: Config) {}

  async start() {
    const { value: token } = this._config.find('runtime.keys', { name: 'discord.com/token' }) ?? {};
    const { value: channelId } = this._config.find('runtime.keys', { name: 'discord.com/channel' }) ?? {};
    if (!token) {
      throw new Error('Missing token.');
    }

    // https://github.com/discordjs/discord.js
    // GPT Demo: https://youtu.be/CB76_GDrPsE?si=M97FHRxPe8SGZtkS
    const client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
      ],
    });

    client.on('ready', () => {
      log.info('Bot is online.');
    });

    // Ensure bot has permission to channel.
    client.on('messageCreate', async (message) => {
      if (channelId && message.channel.id !== channelId) {
        return;
      }
      if (message.author.bot) {
        return;
      }
      if (message.content.startsWith('!')) {
        return;
      }

      // TODO(burdon): Get context from previous messages.
      // const messages = message.channel.messages.fetch({ limit: 10 });
      // console.log(messages.length);

      const {
        author: { username },
        content,
      } = message;
      log('message', { username, content });

      // TODO(burdon): Search spaces.
      // TODO(burdon): Add comment.
      // TODO(burdon): Summarize thread.
      await message.reply(`hello ${username}`);
    });

    await client.login(token);

    {
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
                .map((msg) => `${new Date(msg.createdTimestamp).toISOString()} ${msg.author.username}: ${msg.content}`)
                .join('\n');
              if (messagesConcatenated.length === 0) {
                return '';
              }

              return `CONVERSATION:\n${messagesConcatenated}\n`;
            } catch (err: any) {
              log.info(`${channel?.name} ${err.message}`);
              return '';
            }
          }),
        )
      ).flat();

      log.info(messages.join(''));
    }
  }

  async stop() {}
}
