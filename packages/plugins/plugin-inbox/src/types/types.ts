//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { INBOX_PLUGIN } from '../meta';

import { CalendarType } from './calendar';
import { MailboxType } from './mail';

export namespace InboxAction {
  const INBOX_ACTION = `${INBOX_PLUGIN}/action`;

  export class CreateMailbox extends Schema.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: Schema.Struct({
      spaceId: Type.SpaceId,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: MailboxType,
    }),
  }) {}

  export class CreateCalendar extends Schema.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: CalendarType,
    }),
  }) {}

  export class SelectMessage extends Schema.TaggedClass<SelectMessage>()(`${INBOX_ACTION}/select-message`, {
    input: Schema.Struct({
      mailboxId: Schema.String,
      message: Schema.optional(DataType.Message),
    }),
    output: Schema.Void,
  }) {}

  export class ExtractContact extends Schema.TaggedClass<ExtractContact>()(`${INBOX_ACTION}/extract-contact`, {
    input: Schema.Struct({
      space: SpaceSchema,
      message: DataType.Message,
    }),
    output: Schema.Void,
  }) {}

  export class RunAssistant extends Schema.TaggedClass<RunAssistant>()(`${INBOX_ACTION}/run-assistant`, {
    input: Schema.Struct({
      // TODO(dmaretskyi): Consider making this a ref so it is serializable.
      mailbox: MailboxType,
    }),
    output: Schema.Void,
  }) {}
}
