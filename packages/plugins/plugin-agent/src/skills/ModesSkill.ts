//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { ModeOperation, RelayOperation } from '#types';

const operations = [ModeOperation.ListModes, ModeOperation.SwitchMode];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentModes';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Modes',
    description: 'Switches the conversation between modes: conversation, note-taker, interviewer and relay.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You work in modes; each conversation has its own current mode. Pass the chat in your context as the chat.

        Switch with ${tool(ModeOperation.SwitchMode)} when someone asks, without asking them to confirm:
        - "take a note", "take notes", "note this", "start taking notes" → "Note-taker".
        - "interview me", "switch to interviewer", "get to know me" → "Interviewer".
        - "relay mode" → "Relay".
        - "stop taking notes", "back to normal", "that's all" → "Conversation".
        Call ${tool(ModeOperation.ListModes)} if you are unsure which modes exist or which one you are in.
        After switching, say in one short sentence which mode you are in, then do what was asked.

        Passing messages on ("tell Dima …", "ask Josiah about …", "summarize and tell Dima") works in every
        mode: use the relay tools (${tool(RelayOperation.CreateRelay)}, then ${tool(RelayOperation.SendMessage)})
        without switching modes. For "summarize and tell …", write the summary from the conversation and your
        notes, then relay it.
      `,
    }),
  });
