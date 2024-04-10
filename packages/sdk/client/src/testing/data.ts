//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

// TODO(burdon): Copied to avoid circular dependency @dxos/client <=> @braneframe/types.
//  Better to simplify tests and remove dependency completely.

export class TextV0Type extends EchoObjectSchema({ typename: 'dxos.Text.v0', version: '0.1.0' })({
  content: S.string,
}) {}

export class DocumentType extends EchoObjectSchema({ typename: 'braneframe.Document', version: '0.1.0' })({
  title: S.optional(S.string),
  content: E.ref(TextV0Type),
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

const _BlockSchema = S.struct({
  timestamp: S.string,
  content: S.optional(E.ref(TextV0Type)),
  object: S.optional(E.ref(E.ExpandoType)),
});
export interface BlockType extends S.Schema.Type<typeof _BlockSchema> {}

export class MessageType extends EchoObjectSchema({ typename: 'braneframe.Message', version: '0.1.0' })({
  type: S.optional(S.string),
  date: S.optional(S.string),
  subject: S.optional(S.string),
  blocks: S.mutable(S.array(_BlockSchema)),
  links: S.optional(S.array(E.ref(E.ExpandoType))),
  read: S.optional(S.boolean),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}

export class ThreadType extends EchoObjectSchema({ typename: 'braneframe.Thread', version: '0.1.0' })({
  title: S.optional(S.string),
  messages: S.mutable(S.array(E.ref(MessageType))),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}) {}
