//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';

import { DelegateTask } from './operations/delegate-task';

const SKILL_KEY = 'org.dxos.skill.delegation';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Delegation',
    description: 'Delegates work to sub-agents and tracks it as plan tasks.',
    tools: Skill.toolDefinitions({ operations: [DelegateTask] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
