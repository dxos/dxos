//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as ContentBlock from './ContentBlock';

/**
 * A file or object attached to a message, separate from its (textual/streamed) `blocks`. The
 * preferred way to link a message to a stored object (e.g. a `Blob`) — see
 * {@link ContentBlock.Reference} for the deprecated block-based alternative.
 */
export const Attachment = Schema.Struct({
  /** Display name (e.g. the original filename). */
  name: Schema.optional(Schema.String),
  /** Reference to the attached object (e.g. a `Blob` or `File`). */
  ref: Ref.Ref(Obj.Unknown),
  /** The source message's `Content-ID` for this attachment, if any — matches a `cid:` reference in an HTML body. */
  contentId: Schema.optional(Schema.String),
});

export interface Attachment extends Schema.Schema.Type<typeof Attachment> {}

/**
 * Message object.
 */
// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
export class Message extends Type.makeObject<Message>(DXN.make('org.dxos.type.message', '0.1.0'))(
  Schema.Struct({
    id: Obj.ID, // TODO(burdon): Remove (from all types in this package).
    parentMessage: Schema.optional(Obj.ID),
    /** Optional grouping identifier for related messages. */
    threadId: Schema.optional(Schema.String),
    /** Message creation timestamp. NOTE: May be different from the object creation timestamp. */
    created: Schema.String.pipe(
      Schema.annotations({ description: 'ISO date string when the message was sent.' }),
      GeneratorAnnotation.set('date.iso8601'),
    ),
    sender: Actor.Actor.pipe(Schema.annotations({ description: 'Identity of the message sender.' })),
    blocks: Schema.Array(ContentBlock.Any).annotations({
      description: 'Contents of the message.',
      default: [],
    }),
    attachments: Schema.optional(
      Schema.Array(Attachment).annotations({
        description: 'Files or objects attached to the message (e.g. email attachments).',
      }),
    ),

    /** Custom properties for specific message types (e.g. attention context, email subject, etc.). */
    // TODO(dmaretskyi): Add tool call ID here.
    properties: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  }).pipe(
    LabelAnnotation.set(['properties.subject']),
    Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'rose' }),
  ),
) {}

export const make = ({
  created,
  sender,
  blocks = [],
  properties,
  ...rest
}: MakeOptional<Omit<Obj.MakeProps<typeof Message>, 'sender'>, 'created' | 'blocks'> & {
  sender: Actor.Actor | Actor.Role;
}) => {
  return Obj.make(Message, {
    created: created ?? new Date().toISOString(),
    sender: typeof sender === 'string' ? { role: sender } : sender,
    blocks,
    properties,
    ...rest,
  });
};

export const extractText = (message: Message): string => {
  return message.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join('\n');
};
