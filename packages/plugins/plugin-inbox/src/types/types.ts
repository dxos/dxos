//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { Actor } from '@dxos/types';

import { meta } from '../meta';

import * as Calendar from './Calendar';
import * as Mailbox from './Mailbox';

export namespace InboxAction {
  const INBOX_ACTION = `${meta.id}/action`;

  export class CreateMailbox extends Schema.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: Schema.Struct({
      db: Database.Database,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Mailbox.Mailbox,
    }),
  }) {}

  export class CreateCalendar extends Schema.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: Schema.Struct({
      db: Database.Database,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Calendar.Calendar,
    }),
  }) {}

  export class ExtractContact extends Schema.TaggedClass<ExtractContact>()(`${INBOX_ACTION}/extract-contact`, {
    input: Schema.Struct({
      db: Database.Database,
      actor: Actor.Actor,
    }),
    output: Schema.Void,
  }) {}

  export class RunAssistant extends Schema.TaggedClass<RunAssistant>()(`${INBOX_ACTION}/run-assistant`, {
    input: Schema.Struct({
      // TODO(dmaretskyi): Consider making this a ref so it is serializable.
      mailbox: Mailbox.Mailbox,
    }),
    output: Schema.Void,
  }) {}
}

const INBOX_OPERATION = `${meta.id}/operation`;

export namespace InboxOperation {
  export const CreateMailbox = Operation.make({
    meta: { key: `${INBOX_OPERATION}/create-mailbox`, name: 'Create Mailbox' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Mailbox.Mailbox,
      }),
    },
  });

  export const CreateCalendar = Operation.make({
    meta: { key: `${INBOX_OPERATION}/create-calendar`, name: 'Create Calendar' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Calendar.Calendar,
      }),
    },
  });

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
