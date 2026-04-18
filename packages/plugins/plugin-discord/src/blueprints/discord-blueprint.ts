//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { CreateBot } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.discord';

const operations = [CreateBot];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
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

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
