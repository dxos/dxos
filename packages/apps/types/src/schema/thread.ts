//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2, // TODO(burdon): Actually delete (need sync range so that doesn't return).
  SPAM = 3,
}

const _RecipientSchema = S.struct({
  identityKey: S.optional(S.string),
  email: S.optional(S.string),
  name: S.optional(S.string),
});

const _BlockSchema = S.struct({
  timestamp: S.string,
  content: S.optional(E.ref(TextV0Type)),
  object: S.optional(E.ref(E.AnyEchoObject)),
});
export interface BlockType extends S.Schema.Type<typeof _BlockSchema> {}

export class MessageType extends EchoObjectSchema({ typename: 'braneframe.Message', version: '0.1.0' })({
  type: S.optional(S.string),
  date: S.optional(S.string),
  from: _RecipientSchema,
  to: S.optional(S.array(_RecipientSchema)),
  cc: S.optional(S.array(_RecipientSchema)),
  subject: S.optional(S.string),
  blocks: S.mutable(S.array(_BlockSchema)),
  links: S.optional(S.array(E.ref(E.AnyEchoObject))),
  state: S.optional(S.enums(MessageState)),
  read: S.optional(S.boolean),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}

// TODO(wittjosiah): This is way too coupled with email.
//   Thread messages and email messages should not be the same thing.
//   Interoperability should be handled by lenses or some other transformation mechanism.
//   Requiring the same schema for all types of messages will not scale -
//   It also makes the simple cases much more complex than they need to be.
export class ThreadType extends EchoObjectSchema({ typename: 'braneframe.Thread', version: '0.1.0' })({
  title: S.optional(S.string),
  messages: S.mutable(S.array(E.ref(MessageType))),
  // TODO(burdon): Reconcile with Message.Context.
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}

// TODO(burdon): Reconcile with Thread?
export class MailboxType extends EchoObjectSchema({ typename: 'braneframe.Mailbox', version: '0.1.0' })({
  title: S.optional(S.string),
  messages: S.mutable(S.array(E.ref(MessageType))),
}) {}

export class ContactType extends EchoObjectSchema({ typename: 'braneframe.Contact', version: '0.1.0' })({
  name: S.optional(S.string),
  identifiers: S.mutable(
    S.array(
      S.struct({
        type: S.string,
        value: S.string,
      }),
    ),
  ),
}) {}

export class EventType extends EchoObjectSchema({ typename: 'braneframe.Event', version: '0.1.0' })({
  title: S.optional(S.string),
  owner: _RecipientSchema,
  attendees: S.mutable(S.array(_RecipientSchema)),
  startDate: S.string,
  links: S.mutable(S.array(E.ref(E.AnyEchoObject))),
}) {}

export class AddressBookType extends EchoObjectSchema({ typename: 'braneframe.AddressBook', version: '0.1.0' })({}) {}

export class CalendarType extends EchoObjectSchema({ typename: 'braneframe.Calendar', version: '0.1.0' })({}) {}
