//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.table';

export const key = SKILL_KEY;

export const make = (): Skill.Skill =>
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
