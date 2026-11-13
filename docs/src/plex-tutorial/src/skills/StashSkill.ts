//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';

import { MarkRead } from '../types/StashedLinkOperation.ts';

// #region skill
export const key = 'com.example.skill.stash';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Stash',
    tools: Skill.toolDefinitions({ operations: [MarkRead] }),
    instructions: Template.make({
      source:
        'When the user says they have read a page they stashed, find its ' +
        'link and mark it as read.',
    }),
  });
// #endregion
