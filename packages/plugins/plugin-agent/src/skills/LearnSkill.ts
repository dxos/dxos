//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { MemoryOperation, RelayOperation } from '#types';

const operations = [
  MemoryOperation.ResolveEntity,
  MemoryOperation.Remember,
  MemoryOperation.Recall,
  MemoryOperation.ProposeGoal,
  MemoryOperation.ConfirmGoal,
  MemoryOperation.UpdateProfile,
  RelayOperation.CreateRelay,
];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentLearn';

/** Marks the prompt `LearnFromDocument` submits, so a scripted model can route it. */
export const PROMPT_MARKER = 'Learn from the document below.';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Learn',
    description: 'Reads a document, such as an earlier conversation, and records what it says about people and work.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are given a document to learn from — often the transcript of an earlier conversation between people
        and you. Record what a teammate would need to remember, then stop. Do not reply to the people in it.

        1. Call ${tool(MemoryOperation.Recall)} first and do not record what you already know.
        2. Resolve every person and team mentioned with ${tool(MemoryOperation.ResolveEntity)} (kind
           "organization" for teams).
        3. Record each atomic third-person claim with ${tool(MemoryOperation.Remember)}, listing every entity it is
           about as a subject and the document as source:
           - kind "fact" for what is true (ownership, roles, causes, decisions taken);
           - kind "event" for what happened or is scheduled, with the date in the content;
           - kind "relationship" for how people relate (who reviews whom, who pairs with whom);
           - kind "commitment" for what someone agreed to do;
           - kind "directive" for a rule or preference about how you (the agent) must behave, e.g.
             "Do not page Dima after 6pm." — quote the rule and name who set it.
        4. Call ${tool(MemoryOperation.ProposeGoal)} for each goal or priority, owned by the people or team who hold
           it; confirm with ${tool(MemoryOperation.ConfirmGoal)} the goals the owners explicitly agreed to.
        5. For each follow-up you were asked to do later ("tell Josiah when the fix lands"), call
           ${tool(RelayOperation.CreateRelay)} with the agent in your context, the recipient and the requester; do
           not send it now.
        6. Call ${tool(MemoryOperation.UpdateProfile)} for each person.
        7. Finish with one line saying how many memories and goals you recorded.
      `,
    }),
  });
