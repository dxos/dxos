//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { type Channel } from './channel';
import { Message } from './message';

const decode = Schema.decodeUnknownEither(Message);

/** Decode an inbound value to a `Message`, or `undefined` if it is not one. */
export const decodeMessage = (value: unknown): Message | undefined => {
  const result = decode(value);
  return Either.isRight(result) ? result.right : undefined;
};

/** Send a request and resolve the reply correlated by `id`; reject on timeout. */
export const request = (channel: Channel, message: Message, opts?: { timeoutMs?: number }): Promise<Message> =>
  new Promise<Message>((resolve, reject) => {
    const timeout = setTimeout(() => {
      off();
      reject(new Error(`crx-protocol request timed out: ${message._tag} ${message.id}`));
    }, opts?.timeoutMs ?? 10_000);
    const off = channel.subscribe((value) => {
      const reply = decodeMessage(value);
      if (reply && reply.id === message.id && reply._tag !== message._tag) {
        clearTimeout(timeout);
        off();
        resolve(reply);
      }
    });
    channel.send(message);
  });

/** Serve inbound requests: decode, dispatch to `handler`, send any reply it returns. */
export const serve = (
  channel: Channel,
  handler: (message: Message) => Promise<Message | undefined> | Message | undefined,
): (() => void) =>
  channel.subscribe((value) => {
    const message = decodeMessage(value);
    if (!message) {
      return;
    }
    void Promise.resolve(handler(message)).then((reply) => {
      if (reply) {
        channel.send(reply);
      }
    });
  });
