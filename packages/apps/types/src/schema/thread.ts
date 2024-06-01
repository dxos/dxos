//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

import { TextV0Type } from './document';

// TODO(burdon): Flatten types.

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2, // TODO(burdon): Actually delete (need sync range so that doesn't return).
  SPAM = 3,
}

export class ContactType extends TypedObject({ typename: 'dxos.org/type/Contact', version: '0.1.0' })({
  name: S.optional(S.String),
  identifiers: S.mutable(
    S.Array(
      S.Struct({
        type: S.String,
        value: S.String,
      }),
    ),
  ),
}) {}

const _RecipientSchema = S.mutable(
  S.Struct({
    identityKey: S.optional(S.String),
    email: S.optional(S.String),
    name: S.optional(S.String),
    contact: S.optional(ref(ContactType)),
  }),
);

export interface RecipientType extends S.Schema.Type<typeof _RecipientSchema> {}

const _BlockSchema = S.Struct({
  timestamp: S.String,
  // TODO(burdon): Should not be a separate object.
  content: S.optional(ref(TextV0Type)),
  object: S.optional(ref(Expando)),
});

export interface BlockType extends S.Schema.Type<typeof _BlockSchema> {}

// TODO(wittjosiah): This is way too coupled with email.
//  Thread messages and email messages should not be the same thing.
//  Interoperability should be handled by lenses or some other transformation mechanism.
//  Requiring the same schema for all types of messages will not scale -
//  It also makes the simple cases much more complex than they need to be.
//  [burdon]: The intent of course is to enable a universal inbox out of the box.
export class MessageType extends TypedObject({ typename: 'braneframe.Message', version: '0.1.0' })({
  type: S.optional(S.String),
  date: S.optional(S.String),
  from: _RecipientSchema,
  to: S.optional(S.Array(_RecipientSchema)),
  cc: S.optional(S.Array(_RecipientSchema)),
  subject: S.optional(S.String),
  blocks: S.mutable(S.Array(_BlockSchema)),
  links: S.optional(S.Array(ref(Expando))),
  state: S.optional(S.Enums(MessageState)),
  read: S.optional(S.Boolean),
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}

export class ThreadType extends TypedObject({ typename: 'braneframe.Thread', version: '0.1.0' })({
  title: S.optional(S.String),
  messages: S.mutable(S.Array(ref(MessageType))),
  // TODO(burdon): Reconcile with Message.Context.
  // TODO(burdon): Partial?
  // TODO(burdon): Evolve "attention object" to be current UX state? E.g., of Deck?
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}

// TODO(burdon): Reconcile with Thread?
export class MailboxType extends TypedObject({ typename: 'dxos.org/type/Mailbox', version: '0.1.0' })({
  title: S.optional(S.String),
  messages: S.optional(S.mutable(S.Array(ref(MessageType)))),
}) {}

export class EventType extends TypedObject({ typename: 'dxos.org/type/Event', version: '0.1.0' })({
  title: S.optional(S.String),
  owner: _RecipientSchema,
  attendees: S.mutable(S.Array(_RecipientSchema)),
  startDate: S.String,
  links: S.mutable(S.Array(ref(Expando))),
}) {}

export class AddressBookType extends TypedObject({ typename: 'dxos.org/type/AddressBook', version: '0.1.0' })({}) {}

export class CalendarType extends TypedObject({ typename: 'dxos.org/type/Calendar', version: '0.1.0' })({}) {}
