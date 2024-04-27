//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Copied to avoid circular dependency @dxos/client <=> @braneframe/types.
//  Better to simplify tests and remove dependency completely.

export class TextV0Type extends TypedObject({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

export class DocumentType extends TypedObject({ typename: 'braneframe.Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: ref(TextV0Type),
}) {}

export class ContactType extends TypedObject({ typename: 'braneframe.Contact', version: '0.1.0' })({
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

const _BlockSchema = S.struct({
  timestamp: S.string,
  content: S.optional(ref(TextV0Type)),
  object: S.optional(ref(Expando)),
});
export interface BlockType extends S.Schema.Type<typeof _BlockSchema> {}

export class MessageType extends TypedObject({ typename: 'braneframe.Message', version: '0.1.0' })({
  type: S.optional(S.string),
  date: S.optional(S.string),
  subject: S.optional(S.string),
  blocks: S.mutable(S.array(_BlockSchema)),
  links: S.optional(S.array(ref(Expando))),
  read: S.optional(S.boolean),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}

export class ThreadType extends TypedObject({ typename: 'braneframe.Thread', version: '0.1.0' })({
  title: S.optional(S.string),
  messages: S.mutable(S.array(ref(MessageType))),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}
