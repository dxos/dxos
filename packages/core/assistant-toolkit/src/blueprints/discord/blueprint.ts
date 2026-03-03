//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { DiscordFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/discord';

const functions = Object.values(DiscordFunctions);

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
    tools: [ToolId.make(DiscordFunctions.Fetch.key)],
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
