//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, ObjectId, TypedObject } from '@dxos/echo/internal';
import { defineObjectMigration } from '@dxos/echo-db';

import * as Actor from './Actor';
import * as ContentBlock from './ContentBlock';

/**
 * Message.
 */
// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
const MessageSchema = Schema.Struct({
  id: ObjectId,
  // TODO(dmaretskyi): Consider adding a channelId too.
  parentMessage: Schema.optional(ObjectId),
  created: Schema.String.pipe(
    Schema.annotations({ description: 'ISO date string when the message was sent.' }),
    GeneratorAnnotation.set('date.iso8601'),
  ),
  sender: Schema.mutable(Actor.Actor).pipe(Schema.annotations({ description: 'Identity of the message sender.' })),
  blocks: Schema.mutable(Schema.Array(ContentBlock.Any)).annotations({
    description: 'Contents of the message.',
    default: [],
  }),
  // TODO(dmaretskyi): Add tool call ID here.
  properties: Schema.optional(
    Schema.mutable(
      Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
});

export const Message = MessageSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
);

export interface Message extends Schema.Schema.Type<typeof Message> {}

export const makeMessage = (sender: Actor.Actor | Actor.Role, blocks: ContentBlock.Any[]) => {
  return Obj.make(Message, {
    created: new Date().toISOString(),
    sender: typeof sender === 'string' ? { role: sender } : sender,
    blocks,
  });
};

/** @deprecated */
export enum MessageV1State {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** @deprecated */
export class MessageV1 extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  timestamp: Schema.String,
  state: Schema.optional(Schema.Enums(MessageV1State)),
  sender: Actor.Actor,
  text: Schema.String,
  parts: Schema.optional(Schema.mutable(Schema.Array(Type.Ref(Type.Expando)))),
  properties: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
  context: Schema.optional(Type.Ref(Type.Expando)),
}) {}

/** @deprecated */
export const MessageV1ToV2 = defineObjectMigration({
  from: MessageV1,
  to: Message,
  transform: async (from) => {
    return {
      id: from.id,
      created: from.timestamp,
      sender: from.sender,
      blocks: [
        {
          _tag: 'text' as const,
          text: from.text,
        },
        ...(from.parts ?? []).map((part) => ({
          _tag: 'reference' as const,
          reference: part,
        })),
      ],
      properties: {
        ...from.properties,
        state: from.state,
        context: from.context,
      },
    };
  },
  onMigration: async () => {},
});
