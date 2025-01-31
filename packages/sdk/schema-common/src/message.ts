//
// Copyright 2025 DXOS.org
//

import { Expando, Ref, TypedObject, S } from '@dxos/echo-schema';

import { ActorSchema } from './actor';

export class MessageType extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  /** ISO date string when the message was sent. */
  timestamp: S.String,
  /** Identity of the message sender. */
  sender: ActorSchema,
  /** Text content of the message. */
  text: S.String,
  /** Non-text content sent with a message (e.g., files, polls, etc.) */
  parts: S.optional(S.mutable(S.Array(Ref(Expando)))),
  /** Custom properties for specific message types (e.g. email subject, cc fields, llm cot, etc.). */
  properties: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
  // TODO(wittjosiah): Add read status:
  //  - Read receipts need to be per space member.
  //  - Read receipts don't need to be added to schema until they being implemented.
  /** Context of the application when message was created. */
  // TODO(burdon): Evolve "attention object" to be current UX state? E.g., of Deck?
  context: S.optional(Ref(Expando)),
}) {}
