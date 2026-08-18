//
// Copyright 2025 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.inboxSend';

export const key = SKILL_KEY;

export type InboxSendSkillOptions = {
  /** Send operations contributed by the installed mail providers, resolved by the caller. */
  sendOperations?: readonly Operation.Definition.Any[];
};

export const make = ({ sendOperations = [] }: InboxSendSkillOptions = {}): Skill.Skill =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Inbox (Send)',
    tools: Skill.toolDefinitions({ operations: [...sendOperations], tools: [] }),
    instructions: Template.make({
      source: trim`
        You can send emails.

        There are more inbox-related tools in the "Inbox" skill.
        This skill is meant to be used in conjunction with the "Inbox" skill.
      `,
    }),
  });
