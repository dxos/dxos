//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database, Obj } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Actor } from '@dxos/types';

import { meta } from '../meta';
import * as Mailbox from './Mailbox';
import * as Calendar from './Calendar';

const INBOX_OPERATION = `${meta.id}.operation`;

export namespace InboxOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${INBOX_OPERATION}.on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const ExtractContact = Operation.make({
    meta: { key: `${INBOX_OPERATION}.extract-contact`, name: 'Extract Contact' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        actor: Actor.Actor,
      }),
      output: Schema.Void,
    },
  });

  export const CreateDraft = Operation.make({
    meta: { key: `${INBOX_OPERATION}.create-draft`, name: 'Create Draft' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        mode: Schema.optional(Schema.Literal('compose', 'reply', 'reply-all', 'forward')),
        replyToMessage: Schema.optional(Schema.Any),
        subject: Schema.optional(Schema.String),
        body: Schema.optional(Schema.String),
        // TODO(wittjosiah): Should be Mailbox.Mailbox.
        mailbox: Schema.optional(Schema.Any),
      }),
      output: Schema.Void,
    },
  });

  export const SyncMailbox = Operation.make({
    meta: { key: `${INBOX_OPERATION}.sync-mailbox`, name: 'Sync Mailbox' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        mailbox: Mailbox.Mailbox,
      }),
      output: Schema.Void,
    },
  });

  export const AddMailbox = Operation.make({
    meta: { key: `${INBOX_OPERATION}.add-mailbox`, name: 'Add Mailbox' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        object: Obj.Unknown,
        target: Schema.Union(Database.Database, Collection.Collection),
      }),
      output: Schema.Struct({
        id: Schema.String,
        subject: Schema.Array(Schema.String),
        object: Obj.Unknown,
      }),
    },
  });

  export const SyncCalendar = Operation.make({
    meta: { key: `${INBOX_OPERATION}.sync-calendar`, name: 'Sync Calendar' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        calendar: Calendar.Calendar,
      }),
      output: Schema.Void,
    },
  });
}
