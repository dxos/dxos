//
// Copyright 2025 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { FetchMessages } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.discord';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to fetch messages from Discord servers.

  Known servers:

  DXOS serverId: 837138313172353095
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Discord',
    description: 'Discord integration.',
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [FetchMessages] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
