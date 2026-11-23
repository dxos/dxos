//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import * as AgentChannels from './AgentChannels.ts';
import * as AgentMailbox from './AgentMailbox.ts';

/** Sends an email from the agent's mailbox; its written text is not mailed, so this is how it answers email. */
export const Send = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.sendEmail'),
    name: 'Send email',
    description:
      "Sends an email from the agent's address to a contact or to someone who has emailed the agent; pass `thread` to answer in an existing email thread.",
    icon: 'ph--envelope-simple--regular',
  },
  services: [Database.Service, AgentMailbox.AgentMailboxService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent sending the email.' }),
    to: Schema.String.annotate({ description: 'The recipient address.' }),
    subject: Schema.String.annotate({ description: 'The subject; a reply keeps the thread’s subject.' }),
    text: Schema.String.annotate({ description: 'The body, as plain text.' }),
    thread: Schema.optional(
      Schema.String.annotate({ description: 'The thread token (`thread` in the header) of the email it answers.' }),
    ),
  }),
  output: Schema.Struct({
    message: Schema.String.annotate({ description: 'The Message-ID of the email sent.' }),
    thread: Schema.String.annotate({ description: 'The thread token replies to it come back on.' }),
  }),
}).pipe(AgentChannels.channelSend('thread'));
