//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

/**
 * @deprecated Use @dxos/echo/testing.
 */
// TODO(burdon): REMOVE.
export namespace TestSchema {
  export const TextV0Type = Schema.Struct({
    content: Schema.String,
  }).pipe(
    Type.object({
      typename: 'dxos.org/TextV0',
      version: '0.1.0',
    }),
  );

  export interface TextV0Type extends Schema.Schema.Type<typeof TextV0Type> {}

  export const DocumentType = Schema.Struct({
    title: Schema.optional(Schema.String), // TODO(burdon): Change to name.
    content: Type.Ref(TextV0Type),
  }).pipe(
    Type.object({
      typename: 'braneframe.com/Document',
      version: '0.1.0',
    }),
  );

  export interface DocumentType extends Schema.Schema.Type<typeof DocumentType> {}

  export const ContactType = Schema.Struct({
    name: Schema.optional(Schema.String),
    identifiers: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          type: Schema.String,
          value: Schema.String,
        }),
      ),
    ),
  }).pipe(Type.object({ typename: 'braneframe.com/Contact', version: '0.1.0' }));

  const BlockSchema = Schema.Struct({
    timestamp: Schema.String,
    content: Schema.optional(Type.Ref(TextV0Type)),
    object: Schema.optional(Type.Ref(Type.Obj)),
  });

  export interface BlockType extends Schema.Schema.Type<typeof BlockSchema> {}
  export const BlockType: Schema.Schema<BlockType, Schema.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

  export const MessageType = Schema.Struct({
    type: Schema.optional(Schema.String),
    date: Schema.optional(Schema.String),
    subject: Schema.optional(Schema.String),
    blocks: Schema.mutable(Schema.Array(BlockSchema)),
    links: Schema.optional(Schema.Array(Type.Ref(Type.Obj))),
    read: Schema.optional(Schema.Boolean),
    context: Schema.optional(
      Schema.Struct({
        space: Schema.optional(Schema.String),
        schema: Schema.optional(Schema.String),
        object: Schema.optional(Schema.String),
      }),
    ),
  }).pipe(
    Type.object({
      typename: 'braneframe.com/Message',
      version: '0.1.0',
    }),
  );
  export type MessageType = Schema.Schema.Type<typeof MessageType>;

  export const ThreadType = Schema.Struct({
    title: Schema.optional(Schema.String),
    messages: Schema.mutable(Schema.Array(Type.Ref(MessageType))),
    context: Schema.optional(
      Schema.Struct({
        space: Schema.optional(Schema.String),
        schema: Schema.optional(Schema.String),
        object: Schema.optional(Schema.String),
      }),
    ),
  }).pipe(
    Type.object({
      typename: 'braneframe.com/Thread',
      version: '0.1.0',
    }),
  );
  export type ThreadType = Schema.Schema.Type<typeof ThreadType>;
}
