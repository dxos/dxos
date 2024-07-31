//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

import { ContactType } from './contact';

export const ActorSchema = S.mutable(
  S.Struct({
    contact: S.optional(ref(ContactType)),
    // TODO(wittjosiah): Should the below fields just be the contact schema?
    //  i.e. it should either be a reference to an existing contact or an inline contact schema.
    identityKey: S.optional(S.String),
    // TODO(burdon): Generalize to handle/identifier?
    email: S.optional(S.String),
    name: S.optional(S.String),
  }),
);

export type ActorType = S.Schema.Type<typeof ActorSchema>;

export class MessageType extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  /** ISO date string when the message was sent. */
  timestamp: S.String,
  /** Identity of the message sender. */
  sender: ActorSchema,
  /** Text content of the message. */
  text: S.String,
  /** Non-text content sent with a message (e.g. files, polls, etc.) */
  parts: S.optional(S.mutable(S.Array(ref(Expando)))),
  /** Custom properties for specific message types (e.g. email subject or cc fields). */
  properties: S.optional(S.mutable(S.Record(S.String, S.Any))),
  // TODO(wittjosiah): Add read status:
  //  - Read receipts need to be per space member.
  //  - Read receipts don't need to be added to schema until they being implemented.
  /** Context of the application when message was created. */
  // TODO(burdon): Evolve "attention object" to be current UX state? E.g., of Deck?
  context: S.optional(ref(Expando)),
}) {}

export const ThreadStatus = S.Union(S.Literal('staged'), S.Literal('active'), S.Literal('resolved'));

export class ThreadType extends TypedObject({ typename: 'dxos.org/type/Thread', version: '0.1.0' })({
  name: S.optional(S.String),
  anchor: S.optional(S.String),
  status: S.optional(ThreadStatus),
  messages: S.mutable(S.Array(ref(MessageType))),
}) {}

export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: S.optional(S.String),
  threads: S.mutable(S.Array(ref(ThreadType))),
}) {}

// TODO(wittjosiah): Factor out.
export enum EmailState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2, // TODO(burdon): Actually delete (need sync range so that doesn't return).
  SPAM = 3,
}
