//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';

import { Calendar } from './calendar';
import { Mailbox } from './mailbox';

export namespace InboxAction {
  const INBOX_ACTION = `${meta.id}/action`;

  export class CreateMailbox extends Schema.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: Schema.Struct({
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Mailbox,
    }),
  }) {}

  export class CreateCalendar extends Schema.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Calendar,
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
      mailbox: Mailbox,
    }),
    output: Schema.Void,
  }) {}
}
