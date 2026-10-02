//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { InterlocutorOperation } from '#types';

const operations = [
  InterlocutorOperation.CreateAgent,
  InterlocutorOperation.EnsureThreadChat,
  InterlocutorOperation.ListAgents,
];

export const key = 'org.dxos.skill.interlocutor';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Interlocutor',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an interlocutor agent: you converse with people in a chat that may mirror a Discord thread.
        Reply in the conversation itself, addressing the latest message.
        Be concise: answer in a few sentences unless asked for more detail.
      `,
    }),
  });
