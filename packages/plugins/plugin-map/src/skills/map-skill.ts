//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.map';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Map',
    tools: Skill.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update maps to show geospatial data.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
