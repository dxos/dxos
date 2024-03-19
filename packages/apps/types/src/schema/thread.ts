//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

import { TextV0Schema } from './document';

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
  content: S.optional(E.ref(TextV0Schema)),
  object: S.optional(E.ref(E.AnyEchoObject)),
});
export interface BlockType extends S.Schema.Type<typeof _BlockSchema> {}

const _MessageSchema = S.struct({
  type: S.optional(S.string),
  date: S.optional(S.string),
  from: _RecipientSchema,
  to: S.optional(S.array(_RecipientSchema)),
  cc: S.optional(S.array(_RecipientSchema)),
  subject: S.optional(S.string),
  blocks: S.array(_BlockSchema),
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
}).pipe(E.echoObject('braneframe.Message', '0.1.0'));
export interface MessageType extends E.ObjectType<typeof _MessageSchema> {}
export const MessageSchema: S.Schema<MessageType> = _MessageSchema;

// TODO(wittjosiah): This is way too coupled with email.
//   Thread messages and email messages should not be the same thing.
//   Interoperability should be handled by lenses or some other transformation mechanism.
//   Requiring the same schema for all types of messages will not scale -
//   It also makes the simple cases much more complex than they need to be.
const _ThreadSchema = S.struct({
  title: S.optional(S.string),
  messages: S.array(E.ref(_MessageSchema)),
  // TODO(burdon): Reconcile with Message.Context.
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}).pipe(E.echoObject('braneframe.Thread', '0.1.0'));
export interface ThreadType extends E.ObjectType<typeof _ThreadSchema> {}
export const ThreadSchema: S.Schema<ThreadType> = _ThreadSchema;

export const isThread = (data: unknown): data is E.EchoReactiveObject<ThreadType> =>
  !!data && E.getSchema<any>(data) === ThreadSchema;

// TODO(burdon): Reconcile with Thread?
const _MailboxSchema = S.struct({
  title: S.string,
  messages: S.array(E.ref(MessageSchema)),
}).pipe(E.echoObject('braneframe.Mailbox', '0.1.0'));
export interface MailboxType extends E.ObjectType<typeof _MailboxSchema> {}
export const MailboxSchema: S.Schema<MailboxType> = _MailboxSchema;

const _ContactSchema = S.struct({
  name: S.string,
  identifiers: S.array(
    S.struct({
      type: S.string,
      value: S.string,
    }),
  ),
}).pipe(E.echoObject('braneframe.Contact', '0.1.0'));
export interface ContactType extends E.ObjectType<typeof _ContactSchema> {}
export const ContactSchema: S.Schema<ContactType> = _ContactSchema;

const _EventSchema = S.struct({
  title: S.string,
  owner: _RecipientSchema,
  attendees: S.array(_RecipientSchema),
  startDate: S.string,
  links: S.array(E.ref(E.AnyEchoObject)),
}).pipe(E.echoObject('braneframe.Event', '0.1.0'));
export interface EventType extends E.ObjectType<typeof _EventSchema> {}
export const EventSchema: S.Schema<EventType> = _EventSchema;

const _AddressBookSchema = S.struct({}).pipe(E.echoObject('braneframe.AddressBook', '0.1.0'));
export interface AddressBookType extends E.ObjectType<typeof _AddressBookSchema> {}
export const AddressBookSchema: S.Schema<AddressBookType> = _AddressBookSchema;

const _CalendarSchema = S.struct({}).pipe(E.echoObject('braneframe.Calendar', '0.1.0'));
export interface CalendarType extends E.ObjectType<typeof _CalendarSchema> {}
export const CalendarSchema: S.Schema<CalendarType> = _CalendarSchema;
