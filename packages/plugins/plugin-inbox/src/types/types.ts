//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { Message } from '@dxos/types';

import { meta } from '../meta';

import * as Calendar from './Calendar';
import * as Mailbox from './Mailbox';

export namespace InboxAction {
  const INBOX_ACTION = `${meta.id}/action`;

  export class CreateMailbox extends Schema.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: Schema.Struct({
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Mailbox.Mailbox,
    }),
  }) {}

  export class CreateCalendar extends Schema.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Calendar.Calendar,
    }),
  }) {}

  export class SelectMessage extends Schema.TaggedClass<SelectMessage>()(`${INBOX_ACTION}/select-message`, {
    input: Schema.Struct({
      mailboxId: Schema.String,
      message: Schema.optional(Message.Message),
    }),
    output: Schema.Void,
  }) {}

  export class ExtractContact extends Schema.TaggedClass<ExtractContact>()(`${INBOX_ACTION}/extract-contact`, {
    input: Schema.Struct({
      space: SpaceSchema,
      message: Message.Message,
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
