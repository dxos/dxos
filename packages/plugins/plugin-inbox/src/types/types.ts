//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Actor, Message } from '@dxos/types';

import { meta } from '../meta';

import * as Mailbox from './Mailbox';

const INBOX_OPERATION = `${meta.id}/operation`;

export namespace InboxOperation {
  export const ExtractContact = Operation.make({
    meta: { key: `${INBOX_OPERATION}/extract-contact`, name: 'Extract Contact' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        actor: Actor.Actor,
      }),
      output: Schema.Void,
    },
  });

  // TODO(wittjosiah): This appears to be unused.
  export const RunAssistant = Operation.make({
    meta: { key: `${INBOX_OPERATION}/run-assistant`, name: 'Run Inbox Assistant' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        mailbox: Mailbox.Mailbox,
      }),
      output: Schema.Void,
    },
  });

  export const ComposeEmailMode = Schema.Literal('compose', 'reply', 'reply-all', 'forward');
  export type ComposeEmailMode = Schema.Schema.Type<typeof ComposeEmailMode>;

  export const OpenComposeEmailInputStruct = Schema.Struct({
    mode: Schema.optional(ComposeEmailMode),
    originalMessage: Schema.optional(Message.Message),
    subject: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
  });

  export const OpenComposeEmailInput = Schema.UndefinedOr(OpenComposeEmailInputStruct);
  export type OpenComposeEmailInput = Schema.Schema.Type<typeof OpenComposeEmailInputStruct>;

  export const OpenComposeEmail = Operation.make({
    meta: { key: `${INBOX_OPERATION}/open-compose-email`, name: 'Open Compose Email' },
    services: [Capability.Service],
    schema: {
      input: OpenComposeEmailInput,
      output: Schema.Void,
    },
  });
}
