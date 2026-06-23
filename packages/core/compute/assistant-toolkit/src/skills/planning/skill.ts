//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';

import { UpdateTasks } from './operations/update-tasks';

const SKILL_KEY = 'org.dxos.skill.planning';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks using artifacts.',
    tools: Skill.toolDefinitions({ operations: [UpdateTasks] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
