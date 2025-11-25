//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';
import { defineObjectMigration } from '@dxos/echo-db';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as ContentBlock from './ContentBlock';

/**
 * Message object.
 */
// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
export const Message = Schema.Struct({
  id: Obj.ID, // TODO(burdon): Remove (from all types in this package).
  // TODO(dmaretskyi): Consider adding a channelId too.
  parentMessage: Schema.optional(Obj.ID),
  // TODO(burdon): Rename sent (don't clash with metadata for created).
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
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
);

export interface Message extends Schema.Schema.Type<typeof Message> {}

export const make = ({
  created,
  sender,
  blocks = [],
  properties,
}: MakeOptional<Omit<Obj.MakeProps<typeof Message>, 'sender'>, 'created' | 'blocks'> & {
  sender: Actor.Actor | Actor.Role;
}) => {
  return Obj.make(Message, {
    created: created ?? new Date().toISOString(),
    sender: typeof sender === 'string' ? { role: sender } : sender,
    blocks,
    properties,
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
export const MessageV1 = Schema.Struct({
  timestamp: Schema.String,
  state: Schema.optional(Schema.Enums(MessageV1State)),
  sender: Actor.Actor,
  text: Schema.String,
  parts: Schema.optional(Schema.mutable(Schema.Array(Type.Ref(Type.Expando)))),
  properties: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
  context: Schema.optional(Type.Ref(Type.Expando)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Message',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

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
