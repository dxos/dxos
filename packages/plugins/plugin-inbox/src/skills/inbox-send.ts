//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.inbox-send';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Inbox (Send)',
    tools: Skill.toolDefinitions({ operations: [InboxOperation.GmailSend], tools: [] }),
    instructions: Template.make({
      source: trim`
        You can send emails.

        There are more inbox-related tools in the "Inbox" skill.
        This skill is meant to be used in conjunction with the "Inbox" skill.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
