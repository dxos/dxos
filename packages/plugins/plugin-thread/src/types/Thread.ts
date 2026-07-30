//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Message } from '@dxos/types';
import { type MakeOptional } from '@dxos/util';

/**
 * A thread of a channel: the object its replies partition on, appended to the same feed as the
 * messages and reactions it sits among.
 *
 * A thread is an object rather than a mark on the message it branches from, so it can be the datum
 * of its own graph node — its label, actions and companions hang off the thread rather than off the
 * channel — and so creating one never rewrites another participant's message. It carries no channel
 * reference: it lives in that channel's feed, and the article resolves the channel from the node it
 * opens under.
 *
 * **The thread's id is this object's id**, which is what a reply's `threadId` names.
 */
export class Thread extends Type.makeObject<Thread>(DXN.make('org.dxos.chat.thread', '0.1.0'))(
  Schema.Struct({
    /** Message the thread branches from, resolved within the same feed. */
    target: Ref.Ref(Message.Message),
    /** Display name. (Zulip calls this a topic.) */
    name: Schema.optional(Schema.String),
    /** When the thread was created. NOTE: May differ from the object creation timestamp. */
    created: Schema.String.pipe(
      Schema.annotations({ description: 'ISO date string when the thread was created.' }),
      Annotation.GeneratorAnnotation.set('date.iso8601'),
    ),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--chats-circle--regular', hue: 'rose' })),
) {}

export const instanceOf = (value: unknown): value is Thread => Obj.instanceOf(Thread, value);

export const make = ({ created, ...rest }: MakeOptional<Obj.MakeProps<typeof Thread>, 'created'>) =>
  Obj.make(Thread, { created: created ?? new Date().toISOString(), ...rest });
