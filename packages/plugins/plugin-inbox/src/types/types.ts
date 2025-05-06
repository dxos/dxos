//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';
import { MessageType } from '@dxos/schema';

import { CalendarType } from './calendar';
import { MailboxType } from './mail';
import { INBOX_PLUGIN } from '../meta';

export namespace InboxAction {
  const INBOX_ACTION = `${INBOX_PLUGIN}/action`;

  export class CreateMailbox extends S.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: S.Struct({
      spaceId: S.String,
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: MailboxType,
    }),
  }) {}

  export class CreateCalendar extends S.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CalendarType,
    }),
  }) {}

  export class SelectMessage extends S.TaggedClass<SelectMessage>()(`${INBOX_ACTION}/select-message`, {
    input: S.Struct({
      mailboxId: S.String,
      message: S.optional(MessageType),
    }),
    output: S.Void,
  }) {}

  export class ExtractContact extends S.TaggedClass<ExtractContact>()(`${INBOX_ACTION}/extract-contact`, {
    input: S.Struct({
      space: SpaceSchema,
      message: MessageType,
    }),
    output: S.Void,
  }) {}
}
