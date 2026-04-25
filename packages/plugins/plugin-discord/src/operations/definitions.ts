//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { Discord } from '../types';

export const CreateBot = Operation.make({
  meta: {
    key: 'org.dxos.function.discord.create-bot',
    name: 'Create Discord Bot',
    description: 'Creates a new Discord bot with a generated HALO keypair.',
  },
  input: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Display name for the bot.',
      }),
    ),
    applicationId: Schema.optional(
      Schema.String.annotations({
        description: 'Discord application ID.',
      }),
    ),
  }),
  output: Discord.Bot,
  services: [Database.Service],
});

export const SetToken = Operation.make({
  meta: {
    key: 'org.dxos.function.discord.set-token',
    name: 'Set Bot Token',
    description: 'Sets the Discord bot token on an existing Bot object.',
  },
  input: Schema.Struct({
    bot: Ref.Ref(Discord.Bot).annotations({
      description: 'The bot to update.',
    }),
    token: Schema.String.annotations({
      description: 'Discord bot token.',
    }),
  }),
  output: Discord.Bot,
  services: [Database.Service],
});

export const DisconnectGuild = Operation.make({
  meta: {
    key: 'org.dxos.function.discord.disconnect-guild',
    name: 'Disconnect Guild',
    description: 'Removes guild binding from the Bot object.',
  },
  input: Schema.Struct({
    bot: Ref.Ref(Discord.Bot).annotations({
      description: 'The bot to disconnect.',
    }),
  }),
  output: Discord.Bot,
  services: [Database.Service],
});
