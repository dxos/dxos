//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { FetchMessages } from './functions';

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

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
