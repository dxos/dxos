//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as Message from './Message';

/**
 * Declares that a message starts a thread, appended to the same feed as its target.
 *
 * A thread is otherwise implicit — it is the set of messages sharing a `threadId` — so without this
 * a channel could not tell "message with no replies yet" from "message nobody threaded", and every
 * message would have to be treated as a potential thread. Creating a thread is a deliberate act, and
 * this records it.
 *
 * Declared per author and folded at read time (like `Reaction`) rather than written onto the target
 * message: feeds resolve conflicts as last-flush-wins over the whole object, so marking someone
 * else's message would mean re-appending their item and risking clobbering their own edit. That also
 * makes the thread name writable by whoever names it, not only by the target's author.
 */
export class ThreadRoot extends Type.makeObject<ThreadRoot>(DXN.make('org.dxos.type.threadRoot', '0.1.0'))(
  Schema.Struct({
    /** Message that starts the thread; its id is the thread's id. Resolves within the same feed. */
    target: Ref.Ref(Message.Message),
    /** Display name for the thread. The most recently declared name wins. */
    name: Schema.optional(Schema.String),
    creator: Actor.Actor.pipe(Schema.annotations({ description: 'Identity that made this declaration.' })),
    /**
     * When this declaration was last written — renaming re-stamps it, which is what makes the newest
     * name win. NOTE: May be different from the object creation timestamp.
     */
    created: Schema.String.pipe(
      Schema.annotations({ description: 'ISO date string when the thread was declared or last named.' }),
      Annotation.GeneratorAnnotation.set('date.iso8601'),
    ),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--chats-circle--regular', hue: 'rose' })),
) {}

export const instanceOf = (value: unknown): value is ThreadRoot => Obj.instanceOf(ThreadRoot, value);

export const make = ({
  created,
  creator,
  ...rest
}: MakeOptional<Omit<Obj.MakeProps<typeof ThreadRoot>, 'creator'>, 'created'> & {
  creator: Actor.Actor | Actor.Role;
}) =>
  Obj.make(ThreadRoot, {
    created: created ?? new Date().toISOString(),
    creator: typeof creator === 'string' ? { role: creator } : creator,
    ...rest,
  });
