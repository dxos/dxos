//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Discord } from '../../functions';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to fetch messages from Discord servers.

  Known servers:

  DXOS serverId: 837138313172353095
`;

export const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/discord',
  name: 'Discord',
  description: 'Discord integration.',
  instructions: {
    source: Ref.make(Text.make(instructions)),
  },
  tools: [ToolId.make(Discord.fetch.key)],
});
