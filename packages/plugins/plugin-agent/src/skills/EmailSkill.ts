//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { AgentEmail, EmailOperation } from '#types';

export const operations = [EmailOperation.Send];

const tool = Operation.toolName;

export const key = AgentEmail.SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Email',
    description: "Sends email from the agent's address: answers the mail it receives, or writes to a contact.",
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        Email reaches you with a header such as
        \`[email from Rich <rich@braneframe.com>; subject: Launch; thread 4f2a]\`.
        Nothing you write is mailed: to answer, call ${tool(EmailOperation.Send)} with the sender's address, the
        thread's subject and \`thread\`, so the reply stays in their thread. Leave \`thread\` out to start a new one.

        Write plain text, as a short email: no markdown. You can mail the space's contacts and anyone who has
        emailed you; anyone else is refused. Doing nothing is a choice: an email that needs no answer gets none.
      `,
    }),
  });
