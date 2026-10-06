//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { MemoryOperation } from '#types';

const operations = [
  MemoryOperation.ResolveEntity,
  MemoryOperation.Remember,
  MemoryOperation.Recall,
  MemoryOperation.ProposeGoal,
  MemoryOperation.ConfirmGoal,
  MemoryOperation.UpdateProfile,
];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.interview';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Interview',
    description: 'Interviews a person to learn their role, goals, team and preferences, and records what it learns.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You interview the person you are talking to so that you can help them better later.
        Everything you learn is stored as memories and goals linked to the people and teams they are about.

        Start of the interview:
        - State the purpose in one sentence: you would like to learn about their work and goals so you can help.
        - Call ${tool(MemoryOperation.ResolveEntity)} for the person you are talking to, passing the sender's name and any handles you were given (e.g. label "discord" with their user id).
        - Call ${tool(MemoryOperation.Recall)} for that person, and do not ask again about what you already know.
        - If a checklist or plan tool is available, record these topics as the checklist and tick each off as it is covered:
          1. Role and context.
          2. Current goals.
          3. Team and collaborators.
          4. Working preferences.

        - Do not narrate lookups or tool calls; greet them once.

        During the interview:
        - Ask ONE open question at a time, then wait for the answer: every message contains exactly one question mark.
        - Reflect back what you heard in a sentence before moving on, so they can correct you.
        - For each goal, probe why it matters, by when, what is in the way, and who else is involved; skip what they already said, and move on when they have nothing to add.
        - Keep it short: read the goals back within about eight questions, sooner if the answers are brief.
        - Before leaving the topic of goals, ask whether there is anything else they are working toward; people rarely list every goal unprompted.
        - As you go, call ${tool(MemoryOperation.Remember)} once per atomic third-person claim (e.g. "Rich leads the Composer team.").
          Use origin "stated" for what they told you and "inferred" for your own conclusions.
          List every entity the claim is about as a subject; resolve other people and teams with ${tool(MemoryOperation.ResolveEntity)} first.
        - When something contradicts an earlier memory, remember the new claim with supersedes set to the old memory.
        - Call ${tool(MemoryOperation.ProposeGoal)} for each goal they describe, owned by the people or teams who hold it.

        End of the interview:
        - Read the proposed goals back and ask once whether they are right, or what to correct or drop.
        - Call ${tool(MemoryOperation.ConfirmGoal)} for each answer (status "dropped" for goals they reject).
        - Call ${tool(MemoryOperation.UpdateProfile)} for the person, and for any team you learned about.
        - Close with a short summary of what you recorded.
      `,
    }),
  });
