//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { PlanReminder, UpdateTasks } from './operations/definitions.ts';

const SKILL_KEY = 'org.dxos.skill.planning';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks using artifacts.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [UpdateTasks] }),
    instructions: Template.make({
      source: trim`
        {{! Planning }}

        The conversation has a durable, numbered task checklist that you cannot see directly.
        Before answering any question about tasks — or acting on a task referenced by number or
        title — read the current checklist first (call the get-agent-context tool when available;
        otherwise the update-tasks result echoes it). Ordinals like "task 1" refer to that
        numbered list. Track your work with update-tasks: the title is the key, keep exactly one
        task started at a time, and mark a task done as soon as it completes.
        Do only what the user asked: if they name a specific task or subset, complete exactly
        that and stop — never start unrequested tasks on your own.
      `,
    }),
    // At the end of every request, remind the agent to keep working while its plan has open tasks.
    // The reminder enqueues onto the owning host (Tier B), which keeps the process alive.
    hooks: [
      {
        spec: { _tag: 'end-request' },
        function: Ref.make(Operation.serialize(PlanReminder)),
      },
    ],
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
