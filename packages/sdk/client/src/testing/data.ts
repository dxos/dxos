//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Remove.

/** @deprecated */
export class TextV0Type extends TypedObject({ typename: 'dxos.org/TextV0', version: '0.1.0' })({
  content: S.String,
}) {}

/** @deprecated */
export class DocumentType extends TypedObject({ typename: 'braneframe.com/Document', version: '0.1.0' })({
  title: S.optional(S.String), // TODO(burdon): Change to name.
  content: Ref(TextV0Type),
}) {}

/** @deprecated */
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

/** @deprecated */
const BlockSchema = S.Struct({
  timestamp: S.String,
  content: S.optional(Ref(TextV0Type)),
  object: S.optional(Ref(Expando)),
});

/** @deprecated */
export interface BlockType extends S.Schema.Type<typeof BlockSchema> {}
/** @deprecated */
export const BlockType: S.Schema<BlockType, S.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

/** @deprecated */
export class MessageType extends TypedObject({ typename: 'braneframe.com/Message', version: '0.1.0' })({
  type: S.optional(S.String),
  date: S.optional(S.String),
  subject: S.optional(S.String),
  blocks: S.mutable(S.Array(BlockSchema)),
  links: S.optional(S.Array(Ref(Expando))),
  read: S.optional(S.Boolean),
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}

/** @deprecated */
export class ThreadType extends TypedObject({ typename: 'braneframe.com/Thread', version: '0.1.0' })({
  title: S.optional(S.String),
  messages: S.mutable(S.Array(Ref(MessageType))),
  context: S.optional(
    S.Struct({
      space: S.optional(S.String),
      schema: S.optional(S.String),
      object: S.optional(S.String),
    }),
  ),
}) {}
