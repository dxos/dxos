//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { ContextAdd, ContextRemove } from './operations/definitions.ts';

export const key = 'org.dxos.skill.chatContext';

const instructions = trim`
  You can bind objects into the chat's context so later turns can see them, and unbind them again.
  Reading and writing the objects themselves — including types, relations and tags — is the
  Database skill's job (plugin-space).
`;

export const make = () =>
  Skill.make({
    key,
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

export { ChatContextHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
