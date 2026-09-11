//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DelegateTask, DelegateTasks } from './operations/definitions.ts';

const SKILL_KEY = 'org.dxos.skill.delegation';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Delegation',
    description: 'Delegates work to sub-agents and tracks it as plan tasks.',
    tools: Skill.toolDefinitions({ operations: [DelegateTask, DelegateTasks] }),
    instructions: Template.make({
      source: trim`
        {{! Delegation }}

        Delegate existing checklist tasks with the delegate-tasks tool, selecting by 1-based
        ordinal or exact title; delegate-task creates a NEW task from a title. When unsure what
        the checklist holds, read it first (get-agent-context when available). Delegated tasks
        run in the background once their dependencies are done, and each result is reported back
        to the conversation.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
