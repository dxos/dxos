//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { MemoryFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/memory';

const instructions = trim`
  You have the ability to save and recall memories.
  Memories are persistent knowledge units stored in the database.
  Use memories to remember facts, user preferences, decisions, and any knowledge that should persist across conversations.

  When the user asks you to remember something, save it as a memory with a descriptive title.
  When the user asks about something you might have stored, query your memories first.
  You can also delete outdated or incorrect memories.
`;

const functions = Object.values(MemoryFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Memory',
    description: 'Persistent memory storage and retrieval.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: Blueprint.toolDefinitions({ functions }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
