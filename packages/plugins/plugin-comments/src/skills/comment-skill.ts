//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { CommentOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.comments';

const make = () =>
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

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
