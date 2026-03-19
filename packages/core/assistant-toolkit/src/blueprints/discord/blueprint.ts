//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { FetchMessages, DiscordHandlers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.discord';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to fetch messages from Discord servers.

  Known servers:

  DXOS serverId: 837138313172353095
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Discord',
    description: 'Discord integration.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: Blueprint.toolDefinitions({ operations: [FetchMessages] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: DiscordHandlers,
  make,
};

export default blueprint;
