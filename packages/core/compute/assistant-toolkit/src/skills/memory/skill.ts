//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { DeleteMemory, QueryMemories, SaveMemory } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.memory';

const instructions = trim`
  You have the ability to save and recall memories.
  Memories are persistent knowledge units stored in the database.
  Use memories to remember facts, user preferences, decisions, and any knowledge that should persist across conversations.

  When the user asks you to remember something, save it as a memory with a descriptive title.
  When the user asks about something you might have stored, query your memories first.
  You can also delete outdated or incorrect memories.
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Memory',
    description: 'Persistent memory storage and retrieval.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [SaveMemory, QueryMemories, DeleteMemory] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
