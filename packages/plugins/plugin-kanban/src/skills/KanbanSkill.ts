//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.kanban';

export const key = SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Kanban',
    tools: Skill.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update kanban boards to show data in sorted columns defined by schema.
      `,
    }),
  });
