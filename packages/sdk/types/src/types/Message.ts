//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
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
  sender: Actor.Actor.pipe(Schema.annotations({ description: 'Identity of the message sender.' })),
  blocks: Schema.Array(ContentBlock.Any).annotations({
    description: 'Contents of the message.',
    default: [],
  }),
  // TODO(dmaretskyi): Add tool call ID here.
  properties: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
      description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['properties.subject']),
  Annotation.IconAnnotation.set({
    icon: 'ph--envelope--regular',
    hue: 'red',
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
