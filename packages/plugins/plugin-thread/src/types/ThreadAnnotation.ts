//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';

/**
 * Per-service metadata on a `Message`, expressed as typed instance annotations rather than keys in
 * the untyped `properties` bag — `properties` carries provider-specific transport headers (email
 * subject/to/cc/messageId, the assistant's tool-call id) and giving each service its own typed
 * annotation keeps those concerns from colliding. Chat owns the thread; review will own `resolved`.
 *
 * Keys are namespaced on the service (`org.dxos.chat.*`), not the plugin id, so the stage-2
 * `plugin-thread` → `plugin-chat` rename cannot orphan persisted values.
 */

/**
 * Thread-level metadata, carried by the thread's root message — the root's id *is* the thread's id,
 * so the thread needs no object of its own. One annotation covers the whole concern: further thread
 * state joins this struct rather than minting another annotation per field.
 */
export const Thread = Annotation.make({
  id: 'org.dxos.chat.thread',
  schema: Schema.Struct({
    /** Display name for the thread. (Zulip calls this a topic.) */
    name: Schema.optional(Schema.String),
  }),
});

export type Thread = Schema.Schema.Type<typeof Thread.schema>;

/** The thread metadata on a message, or undefined when it roots no named thread. */
export const getThread = (message: Message.Message): Thread | undefined =>
  Option.getOrUndefined(Annotation.get(message, Thread));

/** The thread's display name, if it has one. */
export const getName = (message: Message.Message): string | undefined => getThread(message)?.name;

/**
 * Sets (or clears) the thread's name, preserving any other thread metadata. Re-appends the message
 * to its feed, so only the root's author should call it — under the feed's last-flush-wins rule a
 * second writer would clobber them.
 */
export const setName = (message: Message.Message, name: string | undefined): void =>
  update(message, (thread) => ({ ...thread, name: name?.length ? name : undefined }));

/** Applies `mutate` to the thread metadata, dropping the annotation once every field is empty. */
const update = (message: Message.Message, mutate: (thread: Thread) => Thread): void => {
  Obj.update(message, (message) => {
    const next = mutate(getThread(message) ?? {});
    if (Object.values(next).every((value) => value === undefined)) {
      delete Obj.getMeta(message).annotations[Thread.key];
    } else {
      Annotation.set(message, Thread, next);
    }
  });
};
