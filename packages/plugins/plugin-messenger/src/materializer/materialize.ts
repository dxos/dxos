//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Feed, Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { InboxService } from '@dxos/protocols/rpc';
import { Message } from '@dxos/types';

import { Notifications } from '#types';

/** The relay did not accept an ack; the messages stay pending and are deduplicated on redelivery. */
export class MessageAckError extends BaseError.extend('MessageAckError', 'Failed to acknowledge inbox messages.') {}

/** A contact as far as materialization is concerned: who may post, and the DID to attribute them by. */
export type Sender = { did: string };

export type MaterializeProps = {
  /** Pending inbox messages, as `HaloInbox.messages` emits them. */
  messages: readonly InboxService.InboxMessage[];
  /** Senders allowed to post, keyed by hex identity key; everyone else's messages stay pending. */
  contacts: ReadonlyMap<string, Sender>;
  ack: (ids: readonly string[]) => Promise<void>;
};

export type MaterializeResult = {
  /** Messages this call wrote to the feed. */
  written: Message.Message[];
  acked: string[];
};

/**
 * Stores each pending message from a contact in the database's notifications feed, then acks it.
 *
 * Ack comes after the write so a crash in between re-delivers rather than loses the message; the
 * envelope id recorded as a foreign key turns that re-delivery (or another device's copy) into a no-op.
 * Messages from non-contacts are left pending, so they appear if the sender later becomes a contact.
 */
export const materialize = Effect.fn('InboxMaterializer.materialize')(function* ({
  messages,
  contacts,
  ack,
}: MaterializeProps) {
  const candidates = messages.filter(
    (message) => message.type === InboxService.INBOX_MESSAGE_TYPE && contacts.has(message.senderIdentityKey.toHex()),
  );
  if (candidates.length === 0) {
    return { written: [], acked: [] } satisfies MaterializeResult;
  }

  const notifications = yield* Notifications.getOrCreate;
  const feed = yield* Database.load(notifications.feed);
  const written: Message.Message[] = [];
  const acked: string[] = [];
  for (const inboxMessage of candidates) {
    const data = Message.decodeJson(inboxMessage.payload);
    // An undecodable payload can never become valid, so it is dropped rather than retried.
    if (Option.isNone(data)) {
      acked.push(inboxMessage.id);
      continue;
    }

    const [existing] = yield* Feed.query(feed, Notifications.envelopeFilter(inboxMessage.id)).run;
    if (!existing) {
      const sender = contacts.get(inboxMessage.senderIdentityKey.toHex());
      const message = Obj.make(Message.Message, {
        ...data.value,
        // The payload's own sender claim is unverified; the envelope's signer is not.
        sender: { ...data.value.sender, identityDid: sender?.did },
        [Obj.Meta]: { keys: [{ source: Notifications.INBOX_KEY_SOURCE, id: inboxMessage.id }] },
      });
      yield* Feed.append(feed, [message]);
      written.push(message);
    }
    acked.push(inboxMessage.id);
  }

  yield* Database.flush();
  if (acked.length > 0) {
    yield* Effect.tryPromise({
      try: () => ack(acked),
      catch: (error) => new MessageAckError({ cause: error, context: { ids: acked } }),
    });
  }

  return { written, acked } satisfies MaterializeResult;
});
