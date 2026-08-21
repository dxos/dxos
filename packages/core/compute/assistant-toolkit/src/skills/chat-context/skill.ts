//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { ContextAdd, ContextRemove } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.chatContext';

const instructions = trim`
  You can bind objects into the chat's context so later turns can see them, and unbind them again.
  Reading and writing the objects themselves — including types, relations and tags — is the
  Database skill's job (plugin-space).
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Chat context',
    description: "Bind objects into the chat's context, and unbind them.",
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({
      operations: [ContextAdd, ContextRemove],
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
