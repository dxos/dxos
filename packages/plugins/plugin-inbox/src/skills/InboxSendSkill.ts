//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';

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
    tools: Skill.toolDefinitions({ operations: [InboxOperation.SendReply, ...sendOperations], tools: [] }),
    instructions: Template.make({
      source: trim`
        You can send emails.
        To answer an email, use the send-reply tool with the mailbox and the message being answered:
        it threads the reply under that message and sends it from the mailbox.
        Sending asks the user for permission first; if they decline, say so and do not retry.
        If the mailbox is not connected to an email account, the reply is still saved as a draft under the email:
        tell the user it was saved but not sent, and do not retry.

        There are more inbox-related tools in the "Inbox" skill.
        This skill is meant to be used in conjunction with the "Inbox" skill.
      `,
    }),
  });
