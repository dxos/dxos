//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Message } from '@dxos/types';

import { ACTORS, type Actor, type ActorKey, CORPUS, type CorpusMessage } from './corpus.ts';

/** One external person and the messages they have yet to send. */
export type Generator = {
  readonly actor: Actor;
  /** The actor's next message, without sending it. */
  readonly pending: () => CorpusMessage | undefined;
  /** Removes and returns the actor's next message. */
  readonly take: () => CorpusMessage | undefined;
};

/** A generator for one actor over that actor's messages in `corpus`, in order. */
export const make = (key: ActorKey, corpus: readonly CorpusMessage[] = CORPUS): Generator => {
  const messages = corpus.filter((message) => message.from === key);
  let cursor = 0;
  return {
    actor: ACTORS[key],
    pending: () => messages[cursor],
    take: () => messages[cursor++],
  };
};

/** One generator per actor who has a message in `corpus`. */
export const makeAll = (corpus: readonly CorpusMessage[] = CORPUS): Generator[] =>
  [...new Set(corpus.map((message) => message.from))].map((key) => make(key, corpus));

/** The generator whose next message is the earliest, so the actors together send in a fixed order. */
export const next = (generators: readonly Generator[]): Generator | undefined =>
  generators
    .filter((generator) => generator.pending() !== undefined)
    .sort((first, second) => (first.pending()?.created ?? '').localeCompare(second.pending()?.created ?? ''))[0];

/** How many messages the generators have yet to send. */
export const remaining = (generators: readonly Generator[], corpus: readonly CorpusMessage[] = CORPUS): number =>
  generators.reduce((total, generator) => {
    const pending = generator.pending();
    const own = corpus.filter((message) => message.from === generator.actor.key);
    return total + (pending ? own.length - own.indexOf(pending) : 0);
  }, 0);

/** A corpus entry as the message its actor sends. */
export const toMessage = (entry: CorpusMessage): Message.Message => {
  const actor: Actor = ACTORS[entry.from];
  return Message.make({
    created: entry.created,
    sender: { email: actor.email, name: actor.name },
    blocks: [{ _tag: 'text', text: entry.text }],
    properties: { subject: entry.subject },
  });
};
