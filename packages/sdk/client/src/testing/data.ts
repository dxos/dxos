//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Expando, Ref, TypedObject } from '@dxos/echo/internal';

//
// TODO(burdon): Remove.
//

/** @deprecated */
export class TextV0Type extends TypedObject({ typename: 'dxos.org/TextV0', version: '0.1.0' })({
  content: Schema.String,
}) {}

/** @deprecated */
export class DocumentType extends TypedObject({ typename: 'braneframe.com/Document', version: '0.1.0' })({
  title: Schema.optional(Schema.String), // TODO(burdon): Change to name.
  content: Ref(TextV0Type),
}) {}

/** @deprecated */
export class ContactType extends TypedObject({ typename: 'braneframe.com/Contact', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  identifiers: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        type: Schema.String,
        value: Schema.String,
      }),
    ),
  ),
}) {}

/** @deprecated */
const BlockSchema = Schema.Struct({
  timestamp: Schema.String,
  content: Schema.optional(Ref(TextV0Type)),
  object: Schema.optional(Ref(Expando)),
});

/** @deprecated */
export interface BlockType extends Schema.Schema.Type<typeof BlockSchema> {}
/** @deprecated */
export const BlockType: Schema.Schema<BlockType, Schema.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

/** @deprecated */
export class MessageType extends TypedObject({ typename: 'braneframe.com/Message', version: '0.1.0' })({
  type: Schema.optional(Schema.String),
  date: Schema.optional(Schema.String),
  subject: Schema.optional(Schema.String),
  blocks: Schema.mutable(Schema.Array(BlockSchema)),
  links: Schema.optional(Schema.Array(Ref(Expando))),
  read: Schema.optional(Schema.Boolean),
  context: Schema.optional(
    Schema.Struct({
      space: Schema.optional(Schema.String),
      schema: Schema.optional(Schema.String),
      object: Schema.optional(Schema.String),
    }),
  ),
}) {}

/** @deprecated */
export class ThreadType extends TypedObject({ typename: 'braneframe.com/Thread', version: '0.1.0' })({
  title: Schema.optional(Schema.String),
  messages: Schema.mutable(Schema.Array(Ref(MessageType))),
  context: Schema.optional(
    Schema.Struct({
      space: Schema.optional(Schema.String),
      schema: Schema.optional(Schema.String),
      object: Schema.optional(Schema.String),
    }),
  ),
}) {}
