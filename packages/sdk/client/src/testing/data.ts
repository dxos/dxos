//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Copied to avoid circular dependency @dxos/client <=> @braneframe/types.
//  Better to simplify tests and remove dependency completely.

export class TextV0Type extends TypedObject({ typename: 'dxos.org/TextV0', version: '0.1.0' })({
  content: S.String,
}) {}

export class DocumentType extends TypedObject({ typename: 'braneframe.com/Document', version: '0.1.0' })({
  title: S.optional(S.String), // TODO(burdon): Change to name.
  content: ref(TextV0Type),
}) {}

export class ContactType extends TypedObject({ typename: 'braneframe.com/Contact', version: '0.1.0' })({
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

const BlockSchema = S.Struct({
  timestamp: S.String,
  content: S.optional(ref(TextV0Type)),
  object: S.optional(ref(Expando)),
});

export interface BlockType extends S.Schema.Type<typeof BlockSchema> {}
export const BlockType: S.Schema<BlockType, S.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

export class MessageType extends TypedObject({ typename: 'braneframe.com/Message', version: '0.1.0' })({
  type: S.optional(S.String),
  date: S.optional(S.String),
  subject: S.optional(S.String),
  blocks: S.mutable(S.Array(BlockSchema)),
  links: S.optional(S.Array(ref(Expando))),
  read: S.optional(S.Boolean),
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}

export class ThreadType extends TypedObject({ typename: 'braneframe.com/Thread', version: '0.1.0' })({
  title: S.optional(S.String),
  messages: S.mutable(S.Array(ref(MessageType))),
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}
