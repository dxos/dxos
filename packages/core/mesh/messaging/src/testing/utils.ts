//
// Copyright 2022 DXOS.org
//

import { type Event, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { type bufWkt, create } from '@dxos/protocols/buf';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';

import { type Message, type PeerInfo, type SignalMethods } from '../signal-methods';

import { PAYLOAD_1 } from './test-messages';

/** Convert buf PublicKey message to @dxos/keys PublicKey. */
const fromBufKey = (key?: BufPublicKey): PublicKey | undefined => (key ? PublicKey.from(key.data) : undefined);

export const expectPeerAvailable = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      (evt) =>
        evt.event.case === 'peerAvailable' &&
        peer.peerKey === evt.event.value.peer?.peerKey &&
        fromBufKey(evt.topic)?.equals(expectedTopic) === true,
    ),
    6000,
  );

export const expectPeerLeft = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      (evt) =>
        evt.event.case === 'peerLeft' &&
        peer.peerKey === evt.event.value.peer?.peerKey &&
        fromBufKey(evt.topic)?.equals(expectedTopic) === true,
    ),
    6000,
  );

export const expectReceivedMessage = (event: Event<Message>, expectedMessage: Message) => {
  return asyncTimeout(
    event.waitFor(
      (msg) =>
        msg.author?.peerKey === expectedMessage.author?.peerKey &&
        msg.recipient?.peerKey === expectedMessage.recipient?.peerKey &&
        msg.payload?.value != null &&
        expectedMessage.payload?.value != null &&
        PublicKey.from(msg.payload.value).equals(expectedMessage.payload.value),
    ),
    5000,
  );
};

export const createMessage = (author: PeerInfo, recipient: PeerInfo, payload: bufWkt.Any = PAYLOAD_1): Message =>
  create(MessageSchema, {
    author,
    recipient,
    payload,
  });

export const messageEqual = (msg1: Message, msg2: Message) =>
  msg1.author?.peerKey === msg2.author?.peerKey &&
  msg1.recipient?.peerKey === msg2.recipient?.peerKey &&
  msg1.payload?.value != null &&
  msg2.payload?.value != null &&
  PublicKey.from(msg1.payload.value).equals(msg2.payload.value);
