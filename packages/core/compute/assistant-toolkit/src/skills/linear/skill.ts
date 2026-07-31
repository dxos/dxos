//
// Copyright 2025 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { SyncIssues } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.linear';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to sync Linear workspaces.
  Sometimes sync does not complete in one go and you need to call the function again.

  Known workspaces:

  DXOS teamId: 1127c63a-6f77-4725-9229-50f6cd47321c
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Linear',
    description: 'Syncs Linear workspaces.',
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [SyncIssues] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
