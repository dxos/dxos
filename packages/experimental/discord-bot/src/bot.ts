//
// Copyright 2023 DXOS.org
//

import { Client, IntentsBitField } from 'discord.js';

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

export class DiscordBot {
  constructor(private readonly _config: Config) {}

  async start() {
    const { token } = this._config.find('runtime.keys', { name: 'discord.com/token' }) ?? {};
    console.log(':::', token);
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
      console.log(message);
      if (message.author.bot) {
        return;
      }
      const channelId = this._config.find('runtime.keys', { name: 'discord.com/channelId' });
      if (channelId && message.channel.id !== channelId) {
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
      console.log(`> ${username} says "${content}"`);
      await message.reply(`hello ${username}`);
    });

    await client.login(token);
  }

  async stop() {}
}
