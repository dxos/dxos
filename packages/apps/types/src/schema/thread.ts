//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

export class MessageType extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  /** Identity Key */
  // TODO(wittjosiah): This should be unnecessary due to system field indicating the object creator.
  from: S.String,
  /** ISO date string */
  // TODO(wittjosiah): This should be unnecessary due to system field indicating the object creation/received time.
  date: S.String,
  content: S.String,
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

export class ThreadType extends TypedObject({ typename: 'dxos.org/type/Thread', version: '0.1.0' })({
  name: S.optional(S.String),
  anchor: S.optional(S.String),
  messages: S.mutable(S.Array(ref(MessageType))),
}) {}

export class ChannelType extends TypedObject({ typename: 'dxos.org/type/Channel', version: '0.1.0' })({
  name: S.optional(S.String),
  threads: S.mutable(S.Array(ref(ThreadType))),
}) {}
