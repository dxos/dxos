//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { ContextAdd, ContextRemove, RelationCreate, SchemaAdd } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.database';

const instructions = trim`
  You can manage the schemas, relations and tags of the ECHO database, and bind objects into the
  chat context. Reading and writing the objects themselves is the Database skill's job (plugin-space).
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Database schema',
    description: 'Manage schemas, relations and tags, and bind objects into the chat context.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({
      operations: [ContextAdd, ContextRemove, RelationCreate, SchemaAdd],
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
