//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Actor } from '@dxos/types';

import { meta } from '../meta';

import * as Mailbox from './Mailbox';

const INBOX_OPERATION = `${meta.id}/operation`;

export namespace InboxOperation {
  export const ExtractContact = Operation.make({
    meta: { key: `${INBOX_OPERATION}/extract-contact`, name: 'Extract Contact' },
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
    schema: {
      input: Schema.Struct({
        mailbox: Mailbox.Mailbox,
      }),
      output: Schema.Void,
    },
  });
}
