//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { DiscordOperation } from '#types';
import { Discord } from '#types';

// TODO(burdon): Reconcile with assistant-toolkit/blueprints/discord/blueprint.ts.
const operations = [DiscordOperation.CreateBot];

const make = () =>
  Blueprint.make({
    key: Discord.BLUEPRINT_KEY,
    name: 'Discord Bot',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You help manage Discord bot configuration.
        You can create new Discord bots that connect guilds to this space.
        When creating a bot, ask for the Discord application ID if not provided.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Discord.BLUEPRINT_KEY,
  make,
};

export default blueprint;
