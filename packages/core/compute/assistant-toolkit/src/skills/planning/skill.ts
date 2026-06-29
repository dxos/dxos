//
// Copyright 2026 DXOS.org
//

import { Operation, Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';

import { PlanReminder, UpdateTasks } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.planning';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks using artifacts.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [UpdateTasks] }),
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
