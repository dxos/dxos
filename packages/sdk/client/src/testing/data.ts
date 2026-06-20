//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';

/**
 * @deprecated Use @dxos/echo/testing.
 */
// TODO(burdon): REMOVE.
export namespace TestSchema {
  export const TextV0Type = Schema.Struct({
    content: Schema.String,
  }).pipe(Type.makeObject(DXN.make('org.dxos.textV0', '0.1.0')));

  export type TextV0Type = Type.InstanceType<typeof TextV0Type>;

  export const DocumentType = Schema.Struct({
    title: Schema.optional(Schema.String), // TODO(burdon): Change to name.
    content: Ref.Ref(TextV0Type),
  }).pipe(Type.makeObject(DXN.make('com.braneframe.document', '0.1.0')));

  export type DocumentType = Type.InstanceType<typeof DocumentType>;

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
  }).pipe(Type.makeObject(DXN.make('com.braneframe.contact', '0.1.0')));

  const BlockSchema = Schema.Struct({
    timestamp: Schema.String,
    content: Schema.optional(Ref.Ref(TextV0Type)),
    object: Schema.optional(Ref.Ref(Obj.Unknown)),
  });

  export interface BlockType extends Schema.Schema.Type<typeof BlockSchema> {}
  export const BlockType: Schema.Schema<BlockType, Schema.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

  export const MessageType = Schema.Struct({
    type: Schema.optional(Schema.String),
    date: Schema.optional(Schema.String),
    subject: Schema.optional(Schema.String),
    blocks: Schema.mutable(Schema.Array(BlockSchema)),
    links: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))),
    read: Schema.optional(Schema.Boolean),
    context: Schema.optional(
      Schema.Struct({
        space: Schema.optional(Schema.String),
        schema: Schema.optional(Schema.String),
        object: Schema.optional(Schema.String),
      }),
    ),
  }).pipe(Type.makeObject(DXN.make('com.braneframe.message', '0.1.0')));
  export type MessageType = Type.InstanceType<typeof MessageType>;

  export const ThreadType = Schema.Struct({
    title: Schema.optional(Schema.String),
    messages: Schema.mutable(Schema.Array(Ref.Ref(MessageType))),
    context: Schema.optional(
      Schema.Struct({
        space: Schema.optional(Schema.String),
        schema: Schema.optional(Schema.String),
        object: Schema.optional(Schema.String),
      }),
    ),
  }).pipe(Type.makeObject(DXN.make('com.braneframe.thread', '0.1.0')));
  export type ThreadType = Type.InstanceType<typeof ThreadType>;
}
