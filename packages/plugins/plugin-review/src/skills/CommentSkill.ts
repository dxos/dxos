//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { CommentOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.comments';

export const key = SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Comments',
    tools: Skill.toolDefinitions({ operations: [CommentOperation.CreateProposals] }),
    instructions: Template.make({
      // TODO(wittjosiah): Move example to function input schema annotation.
      source: trim`
        You can update markdown documents via proposals.
        For each diff, respond with the smallest possible matching span.
        For example:
          - "There is a tyop in this sentence."
          + "There is a typo in this sentence."
          - "This id goof."
          + "This is good."
      `,
    }),
  });
