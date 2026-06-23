//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';

import INSTRUCTIONS from './composer-instructions.md?raw';

export const COMPOSER_SKILL_KEY = 'org.dxos.skill.composer';

const make = () =>
  Skill.make({
    key: COMPOSER_SKILL_KEY,
    name: 'Composer',
    tools: Skill.toolDefinitions({ operations: [] }),
    instructions: Template.make({ source: INSTRUCTIONS }),
  });

const skill: Skill.Definition = {
  key: COMPOSER_SKILL_KEY,
  make,
};

export default skill;
