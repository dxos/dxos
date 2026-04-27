//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { CreateBot } from '#operations';

// TODO(burdon): Reconcile with assistant-toolkit/blueprints/discord/blueprint.ts.
const BLUEPRINT_KEY = 'org.dxos.blueprint.discord2';

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

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
