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
 * annotation keeps those concerns from colliding. Chat owns `topic`; review will own `resolved`.
 *
 * Keys are namespaced on the service (`org.dxos.chat.*`), not the plugin id, so the stage-2
 * `plugin-thread` → `plugin-chat` rename cannot orphan persisted values.
 */

/** Thread name, Zulip-style. Set on a thread's root message only; editing is an author re-append. */
export const Topic = Annotation.make({
  id: 'org.dxos.chat.topic',
  schema: Schema.String,
});

/** A message's topic, or undefined when it names no thread. */
export const getTopic = (message: Message.Message): string | undefined =>
  Option.getOrUndefined(Annotation.get(message, Topic));

/** Sets (or clears) a message's topic. Re-appends the message to its feed. */
export const setTopic = (message: Message.Message, topic: string | undefined): void => {
  Obj.update(message, (message) => {
    if (topic === undefined || topic.length === 0) {
      delete Obj.getMeta(message).annotations[Topic.key];
    } else {
      Annotation.set(message, Topic, topic);
    }
  });
};
