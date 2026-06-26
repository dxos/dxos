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
  export class TextV0Type extends Type.makeObject<TextV0Type>(DXN.make('org.dxos.textV0', '0.1.0'))(
    Schema.Struct({
      content: Schema.String,
    }),
  ) {}

  export class DocumentType extends Type.makeObject<DocumentType>(DXN.make('com.braneframe.document', '0.1.0'))(
    Schema.Struct({
      title: Schema.optional(Schema.String), // TODO(burdon): Change to name.
      content: Ref.Ref(TextV0Type),
    }),
  ) {}

  export const ContactType = Type.makeObject(DXN.make('com.braneframe.contact', '0.1.0'))(
    Schema.Struct({
      name: Schema.optional(Schema.String),
      identifiers: Schema.mutable(
        Schema.Array(
          Schema.Struct({
            type: Schema.String,
            value: Schema.String,
          }),
        ),
      ),
    }),
  );

  const BlockSchema = Schema.Struct({
    timestamp: Schema.String,
    content: Schema.optional(Ref.Ref(TextV0Type)),
    object: Schema.optional(Ref.Ref(Obj.Unknown)),
  });

  export interface BlockType extends Schema.Schema.Type<typeof BlockSchema> {}
  export const BlockType: Schema.Schema<BlockType, Schema.Schema.Encoded<typeof BlockSchema>> = BlockSchema;

  export class MessageType extends Type.makeObject<MessageType>(DXN.make('com.braneframe.message', '0.1.0'))(
    Schema.Struct({
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
    }),
  ) {}

  export class ThreadType extends Type.makeObject<ThreadType>(DXN.make('com.braneframe.thread', '0.1.0'))(
    Schema.Struct({
      title: Schema.optional(Schema.String),
      messages: Schema.mutable(Schema.Array(Ref.Ref(MessageType))),
      context: Schema.optional(
        Schema.Struct({
          space: Schema.optional(Schema.String),
          schema: Schema.optional(Schema.String),
          object: Schema.optional(Schema.String),
        }),
      ),
    }),
  ) {}
}
