//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';

/**
 * Thread metadata carried by the thread's root message — the root's id *is* the thread's id, so the
 * thread needs no object of its own. Expressed as a typed instance annotation rather than keys in
 * the untyped `properties` bag, which carries provider transport headers (email subject/to/cc, the
 * assistant's tool-call id) that no service should share.
 *
 * The annotation's presence is what makes a thread exist: every message is a *potential* thread and
 * creating one is a deliberate act, so `created` is always set and the mark is never an empty
 * struct. One annotation per _concern_ — later thread state joins this struct rather than minting
 * `org.dxos.chat.threadResolved` beside it.
 *
 * Keys are namespaced on the service (`org.dxos.chat.*`), not the plugin id, so the stage-2
 * `plugin-thread` → `plugin-chat` rename cannot orphan persisted values.
 *
 * NOTE: Writing this re-appends the root message to its feed, which resolves conflicts as
 * last-flush-wins over the whole object — so creating or naming a thread on someone else's message
 * can drop an edit they make concurrently.
 */
export const Thread = Annotation.make({
  id: 'org.dxos.chat.thread',
  schema: Schema.Struct({
    /** When the thread was created. Always set: its presence is the declaration. */
    created: Schema.String,
    /** Display name for the thread. (Zulip calls this a topic.) */
    name: Schema.optional(Schema.String),
  }),
});

export type Thread = Schema.Schema.Type<typeof Thread.schema>;

/** The thread rooted at this message, or undefined where none was created. */
export const get = (message: Message.Message): Thread | undefined =>
  Option.getOrUndefined(Annotation.get(message, Thread));

/** Whether a thread was created from this message. */
export const exists = (message: Message.Message): boolean => get(message) !== undefined;

/** Creates the thread rooted at this message, leaving one that already exists as it is. */
export const create = (message: Message.Message): void => {
  if (!exists(message)) {
    update(message, (thread) => ({ ...thread, created: new Date().toISOString() }));
  }
};

/** Sets (or clears) the thread's name, creating the thread if it does not exist yet. */
export const setName = (message: Message.Message, name: string | undefined): void =>
  update(message, (thread) => ({
    created: thread.created ?? new Date().toISOString(),
    name: name?.length ? name : undefined,
  }));

/** Applies `mutate` to the thread metadata, in a single re-append of the message. */
const update = (message: Message.Message, mutate: (thread: Partial<Thread>) => Thread): void => {
  Obj.update(message, (message) => {
    Annotation.set(message, Thread, mutate(get(message) ?? {}));
  });
};
