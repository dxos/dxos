//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.table';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Table',
    tools: Skill.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update tables to show data in sorted columns defined by schema.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
