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
 * annotation keeps those concerns from colliding. Chat owns the thread name; review will own
 * `resolved`.
 *
 * Keys are namespaced on the service (`org.dxos.chat.*`), not the plugin id, so the stage-2
 * `plugin-thread` → `plugin-chat` rename cannot orphan persisted values.
 */

/**
 * Name of the thread branching from this message. Set on a thread's root message only, since the
 * root's id is the thread's id; editing it is an author re-append. (Zulip calls this a topic.)
 */
export const ThreadName = Annotation.make({
  id: 'org.dxos.chat.threadName',
  schema: Schema.String,
});

/** The name of the thread rooted at this message, or undefined when it has none. */
export const getThreadName = (message: Message.Message): string | undefined =>
  Option.getOrUndefined(Annotation.get(message, ThreadName));

/** Sets (or clears) the thread name. Re-appends the message to its feed. */
export const setThreadName = (message: Message.Message, name: string | undefined): void => {
  Obj.update(message, (message) => {
    if (name === undefined || name.length === 0) {
      delete Obj.getMeta(message).annotations[ThreadName.key];
    } else {
      Annotation.set(message, ThreadName, name);
    }
  });
};
